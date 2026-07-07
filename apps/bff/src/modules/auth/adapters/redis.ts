import type { RefreshToken, RefreshTokenStore } from '@bff/modules/auth/ports';
import { generateRefreshToken, hashRefreshToken } from '@bff/modules/auth/refresh-token';
import type { RedisClient } from 'bun';

/**
 * Redis에 저장하는 값. idle 만료는 키의 네이티브 TTL(PX)이 곧 표현하므로 값에 담지 않고,
 * 회전해도 안 늘어나는 절대 만료(하드캡)만 값으로 들고 다닌다.
 */
interface StoredToken {
  userId: string;
  absoluteExpiresAt: number;
}

const KEY_PREFIX = 'refresh:';

/**
 * RefreshTokenStore의 Redis 어댑터.
 *
 * - idle(슬라이딩)은 `SET ... PX`의 네이티브 TTL. 회전 시 키를 새로 쓰며 PX를 다시 건다.
 * - absolute(하드캡)는 값의 absoluteExpiresAt. 키 TTL이 이 상한을 넘지 않도록 매번 캡한다.
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

  private key(token: string): string {
    return `${KEY_PREFIX}${hashRefreshToken(token)}`;
  }

  async issue(userId: string): Promise<RefreshToken> {
    const now = Date.now();
    const absoluteExpiresAt = now + this.absoluteTtlMs;
    return this.write({ userId, absoluteExpiresAt, now });
  }

  async rotate(token: string): Promise<RefreshToken | null> {
    const now = Date.now();
    const raw = await this.redis.get(this.key(token));
    // 키가 없으면 idle 만료(네이티브 evict)이거나 폐기됨.
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredToken;
    if (stored.absoluteExpiresAt <= now) {
      await this.revoke(token);
      return null;
    }
    await this.revoke(token);
    return this.write({ userId: stored.userId, absoluteExpiresAt: stored.absoluteExpiresAt, now });
  }

  async revoke(token: string): Promise<void> {
    await this.redis.del(this.key(token));
  }

  async deleteExpired(): Promise<number> {
    // 네이티브 TTL이 idle 만료 키를 자동 evict하고, PX를 absolute로 캡하므로 청소 대상이 없다.
    return 0;
  }

  /** 새 토큰을 발급해 idle TTL(absolute 캡 적용)로 저장한다 — issue와 rotate의 공통 경로. */
  private async write({ userId, absoluteExpiresAt, now }: StoredToken & { now: number }): Promise<RefreshToken> {
    const token = generateRefreshToken();
    // idle은 슬라이딩하되 키가 absolute 상한을 넘겨 살아있지 않도록 캡한다.
    const pxMs = Math.max(1, Math.min(this.idleTtlMs, absoluteExpiresAt - now));
    const value: StoredToken = { userId, absoluteExpiresAt };
    await this.redis.set(this.key(token), JSON.stringify(value), 'PX', pxMs);
    return { token, userId, expiresAt: now + pxMs, absoluteExpiresAt };
  }
}
