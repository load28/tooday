import { RedisSessionStore } from '@bff/modules/auth/adapters/redis';
import { SqlSessionStore } from '@bff/modules/auth/adapters/sql';
import type { SessionStore, UserStore } from '@bff/modules/auth/ports';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import { RedisClient } from 'bun';
import type { Kysely } from 'kysely';

export type SessionBackend = 'redis' | 'sql';

export interface SessionStoreBundle {
  sessions: SessionStore;
  backend: SessionBackend;
  /**
   * 앱이 주기적으로 만료 세션을 청소해야 하는가.
   * Redis는 네이티브 TTL이 자동 evict하므로 false, DB 세션 테이블은 조회에 안 걸리는
   * 만료 행이 쌓이므로 true. 컴포지션 루트가 `!redisUrl` 부정 조건 대신 이 의도를 읽는다.
   */
  needsExpirySweep: boolean;
}

export interface CreateSessionStoreDeps {
  /** 설정 시 Redis, 미설정이면 DB 세션 테이블 (DATABASE_URL의 postgres/pglite 선택과 같은 opt-in) */
  redisUrl: string | null;
  db: Kysely<DatabaseSchema>;
  users: UserStore;
  ttlMs: number;
}

/**
 * 세션 저장소 백엔드를 고른다. 선택 조건을 컴포지션 루트에서 걷어내 포트 어댑터 옆
 * 한 곳에 모으고, 백엔드별 만료 청소 필요 여부까지 함께 확정해 돌려준다.
 */
export function createSessionStore({ redisUrl, db, users, ttlMs }: CreateSessionStoreDeps): SessionStoreBundle {
  if (redisUrl) {
    return {
      sessions: new RedisSessionStore({ redis: new RedisClient(redisUrl), users, ttlMs }),
      backend: 'redis',
      needsExpirySweep: false,
    };
  }
  return {
    sessions: new SqlSessionStore({ db, ttlMs }),
    backend: 'sql',
    needsExpirySweep: true,
  };
}
