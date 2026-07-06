import type { Session, SessionStore, SessionWithUser, UserStore } from '@bff/modules/auth/ports';
import { generateSessionToken, hashSessionToken } from '@bff/modules/auth/session-token';
import type { User } from '@tooday/shared';
import type { RedisClient } from 'bun';

/**
 * Redis에 저장하는 값. 유저 스냅샷을 함께 박아 인증 핫패스(getWithUser)가
 * DB를 한 번도 타지 않게 한다. 유저 프로필(이름 등) 변경은 세션이 갱신될 때까지
 * 반영이 지연되지만, 세션 TTL(기본 1주)이 지나면 다음 로그인에서 최신 스냅샷이 실린다.
 */
interface StoredSession {
  user: User;
  expiresAt: number;
}

const KEY_PREFIX = 'session:';

/**
 * SessionStore의 Redis 어댑터.
 *
 * SQL 구현과 두 가지가 다르다:
 * - 만료는 Redis 네이티브 TTL(`SET ... PX`)에 맡긴다. 조회에 안 걸리는 행이
 *   누적되지 않으므로 `deleteExpired` 수동 스윕이 필요 없다(no-op).
 * - `getWithUser`는 조인 대신 세션 값에 담긴 유저 스냅샷을 그대로 돌려준다(DB 0회).
 *
 * 토큰 원문 대신 해시를 키로 쓴다 — Redis 유출이 세션 탈취로 이어지지 않게 한다
 * (SQL 어댑터의 `token_hash`와 동일한 원칙).
 */
export class RedisSessionStore implements SessionStore {
  private readonly redis: RedisClient;
  private readonly users: UserStore;
  private readonly ttlMs: number;

  constructor({ redis, users, ttlMs }: { redis: RedisClient; users: UserStore; ttlMs: number }) {
    this.redis = redis;
    this.users = users;
    this.ttlMs = ttlMs;
  }

  private key(token: string): string {
    return `${KEY_PREFIX}${hashSessionToken(token)}`;
  }

  async create(userId: string): Promise<Session> {
    // 로그인/회원가입은 콜드패스라 여기서 유저를 한 번 읽어 스냅샷으로 굳힌다.
    const user = await this.users.findById(userId);
    if (!user) {
      throw new Error(`세션 생성 대상 유저를 찾을 수 없습니다: ${userId}`);
    }
    const session: Session = {
      token: generateSessionToken(),
      userId,
      expiresAt: Date.now() + this.ttlMs,
    };
    const stored: StoredSession = { user, expiresAt: session.expiresAt };
    // PX는 밀리초 TTL. 음수/0은 Redis가 거부하므로 최소 1ms로 바닥을 깐다.
    await this.redis.set(this.key(session.token), JSON.stringify(stored), 'PX', Math.max(1, this.ttlMs));
    return session;
  }

  async get(token: string): Promise<Session | null> {
    const stored = await this.read(token);
    return stored ? { token, userId: stored.user.id, expiresAt: stored.expiresAt } : null;
  }

  async getWithUser(token: string): Promise<SessionWithUser | null> {
    const stored = await this.read(token);
    if (!stored) return null;
    return {
      session: { token, userId: stored.user.id, expiresAt: stored.expiresAt },
      user: stored.user,
    };
  }

  async revoke(token: string): Promise<void> {
    await this.redis.del(this.key(token));
  }

  async deleteExpired(): Promise<number> {
    // Redis 네이티브 TTL이 만료 키를 자동 evict한다 — 수동 스윕할 대상이 없다.
    return 0;
  }

  private async read(token: string): Promise<StoredSession | null> {
    const raw = await this.redis.get(this.key(token));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }
}
