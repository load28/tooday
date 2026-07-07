import { describe, expect, it } from 'bun:test';
import { RedisRefreshTokenStore } from '@bff/modules/auth/adapters/redis';
import { SqlRefreshTokenStore } from '@bff/modules/auth/adapters/sql';
import { createRefreshTokenStore } from '@bff/modules/auth/refresh-token-store';
import { testDatabase } from '@bff/platform/db/testing';

describe('createRefreshTokenStore — 백엔드 선택', () => {
  const base = async () => ({ db: await testDatabase(), idleTtlMs: 60_000, absoluteTtlMs: 120_000 });

  it('REDIS_URL이 있으면 Redis 백엔드 + 스윕 불필요', async () => {
    // RedisClient는 첫 명령 전까지 접속하지 않으므로 서버 없이 구성만 검증한다.
    const bundle = createRefreshTokenStore({ redisUrl: 'redis://localhost:6379', ...(await base()) });
    expect(bundle.backend).toBe('redis');
    expect(bundle.needsExpirySweep).toBe(false);
    expect(bundle.store).toBeInstanceOf(RedisRefreshTokenStore);
  });

  it('REDIS_URL이 없으면 SQL 백엔드 + 스윕 필요', async () => {
    const bundle = createRefreshTokenStore({ redisUrl: null, ...(await base()) });
    expect(bundle.backend).toBe('sql');
    expect(bundle.needsExpirySweep).toBe(true);
    expect(bundle.store).toBeInstanceOf(SqlRefreshTokenStore);
  });
});
