import { describe, expect, it } from 'bun:test';
import { InMemoryUserStore } from '@bff/modules/auth/adapters/memory';
import { RedisSessionStore } from '@bff/modules/auth/adapters/redis';
import { SqlSessionStore } from '@bff/modules/auth/adapters/sql';
import { createSessionStore } from '@bff/modules/auth/session-store';
import { testDatabase } from '@bff/platform/db/testing';

describe('createSessionStore — 백엔드 선택', () => {
  const base = async () => ({ db: await testDatabase(), users: new InMemoryUserStore(), ttlMs: 60_000 });

  it('REDIS_URL이 있으면 Redis 백엔드 + 스윕 불필요', async () => {
    // RedisClient는 첫 명령 전까지 접속하지 않으므로 서버 없이 구성만 검증한다.
    const bundle = createSessionStore({ redisUrl: 'redis://localhost:6379', ...(await base()) });
    expect(bundle.backend).toBe('redis');
    expect(bundle.needsExpirySweep).toBe(false);
    expect(bundle.sessions).toBeInstanceOf(RedisSessionStore);
  });

  it('REDIS_URL이 없으면 SQL 백엔드 + 스윕 필요', async () => {
    const bundle = createSessionStore({ redisUrl: null, ...(await base()) });
    expect(bundle.backend).toBe('sql');
    expect(bundle.needsExpirySweep).toBe(true);
    expect(bundle.sessions).toBeInstanceOf(SqlSessionStore);
  });
});
