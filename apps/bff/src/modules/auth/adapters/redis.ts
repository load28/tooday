import type { RefreshToken, RefreshTokenStore } from '@bff/modules/auth/ports';
import { generateRefreshToken, hashRefreshToken } from '@bff/modules/auth/refresh-token';
import { newId } from '@bff/platform/ids';
import type { RedisClient } from 'bun';

/**
 * 토큰 키에 저장하는 값. idle 만료는 키의 네이티브 TTL(PX)이 표현하므로 값에 담지 않고,
 * 회전해도 안 늘어나는 절대 만료(하드캡)와 계보·supersede 여부만 값으로 들고 다닌다.
 */
interface StoredToken {
  userId: string;
  familyId: string;
  absoluteExpiresAt: number;
  /** 회전으로 폐기됨(재사용 탐지 대상). 활성 토큰은 false. */
  superseded: boolean;
}

const TOKEN_PREFIX = 'refresh:';
const FAMILY_PREFIX = 'refresh_family:';

/**
 * RefreshTokenStore의 Redis 어댑터.
 *
 * - idle(슬라이딩)은 `SET ... PX`의 네이티브 TTL. 회전 시 키를 새로 쓰며 PX를 다시 건다.
 * - absolute(하드캡)는 값의 absoluteExpiresAt. 키 TTL이 이 상한을 넘지 않도록 매번 캡한다.
 * - 재사용 탐지: 계보별 토큰 해시 SET(refresh_family:*)을 유지해, 이미 supersede된 토큰이
 *   다시 제시되면 그 SET으로 계보 전체를 일괄 삭제한다.
 * - 만료 키는 Redis가 자동 evict하므로 deleteExpired 수동 스윕이 필요 없다(no-op).
 *
 * 토큰 원문 대신 해시를 키로 쓴다 — Redis 유출이 세션 탈취로 이어지지 않게 한다.
 */
export class RedisRefreshTokenStore implements RefreshTokenStore {
  private readonly redis: RedisClient;
  private readonly idleTtlMs: number;
  private readonly absoluteTtlMs: number;

  constructor({ redis, idleTtlMs, absoluteTtlMs }: { redis: RedisClient; idleTtlMs: number; absoluteTtlMs: number }) {
    this.redis = redis;
    this.idleTtlMs = idleTtlMs;
    this.absoluteTtlMs = absoluteTtlMs;
  }

  private tokenKey(token: string): string {
    return `${TOKEN_PREFIX}${hashRefreshToken(token)}`;
  }

  private familyKey(familyId: string): string {
    return `${FAMILY_PREFIX}${familyId}`;
  }

  async issue(userId: string): Promise<RefreshToken> {
    const now = Date.now();
    return this.write({ userId, familyId: newId(), absoluteExpiresAt: now + this.absoluteTtlMs, now });
  }

  async rotate(token: string): Promise<RefreshToken | null> {
    const now = Date.now();
    const raw = await this.redis.get(this.tokenKey(token));
    // 키가 없으면 idle 만료(네이티브 evict)이거나 폐기됨.
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredToken;

    // 이미 회전된(supersede된) 토큰의 재제시 = 탈취 신호 → 계보 전체 무효화.
    if (stored.superseded) {
      await this.revokeFamily(stored.familyId);
      return null;
    }
    if (stored.absoluteExpiresAt <= now) {
      await this.revokeFamily(stored.familyId);
      return null;
    }

    // 옛 토큰은 지우지 않고 supersede 마킹만(남은 TTL 유지 → 재사용 탐지 창), 새 토큰은 같은 계보로.
    const remainingMs = await this.redis.pttl(this.tokenKey(token));
    await this.redis.set(
      this.tokenKey(token),
      JSON.stringify({ ...stored, superseded: true } satisfies StoredToken),
      'PX',
      Math.max(1, remainingMs),
    );
    return this.write({ userId: stored.userId, familyId: stored.familyId, absoluteExpiresAt: stored.absoluteExpiresAt, now });
  }

  async revoke(token: string): Promise<void> {
    const raw = await this.redis.get(this.tokenKey(token));
    if (!raw) return;
    const { familyId } = JSON.parse(raw) as StoredToken;
    await this.revokeFamily(familyId);
  }

  async deleteExpired(): Promise<number> {
    // 네이티브 TTL이 idle 만료 키를 자동 evict하고, PX를 absolute로 캡하므로 청소 대상이 없다.
    return 0;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    const hashes = await this.redis.smembers(this.familyKey(familyId));
    const keys = hashes.map((hash) => `${TOKEN_PREFIX}${hash}`);
    if (keys.length > 0) await this.redis.del(...keys);
    await this.redis.del(this.familyKey(familyId));
  }

  /** 새 토큰을 발급해 idle TTL(absolute 캡)로 저장하고 계보 SET에 등록한다 — issue와 rotate의 공통 경로. */
  private async write({
    userId,
    familyId,
    absoluteExpiresAt,
    now,
  }: Omit<StoredToken, 'superseded'> & { now: number }): Promise<RefreshToken> {
    const token = generateRefreshToken();
    const hash = hashRefreshToken(token);
    // idle은 슬라이딩하되 키가 absolute 상한을 넘겨 살아있지 않도록 캡한다.
    const pxMs = Math.max(1, Math.min(this.idleTtlMs, absoluteExpiresAt - now));
    const value: StoredToken = { userId, familyId, absoluteExpiresAt, superseded: false };
    await this.redis.set(`${TOKEN_PREFIX}${hash}`, JSON.stringify(value), 'PX', pxMs);
    // 계보 SET에 등록하고, SET이 absolute까지는 살아있도록 TTL을 남은 absolute로 맞춘다.
    await this.redis.sadd(this.familyKey(familyId), hash);
    await this.redis.pexpire(this.familyKey(familyId), Math.max(1, absoluteExpiresAt - now));
    return { token, userId, familyId, expiresAt: now + pxMs, absoluteExpiresAt };
  }
}
