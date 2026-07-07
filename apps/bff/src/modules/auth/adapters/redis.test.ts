import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryUserStore } from '@bff/modules/auth/adapters/memory';
import { RedisSessionStore } from '@bff/modules/auth/adapters/redis';
import { redisTestUrl, testRedis } from '@bff/platform/redis/testing';
import type { RedisClient } from 'bun';

const INPUT = { email: 'redis-store@tooday.app', password: 'password123', name: '레디스' };

// 전제(연결·격리)는 testRedis()가 관리한다. 여기선 redisTestUrl로 스킵만 선언한다.
describe.skipIf(!redisTestUrl)('RedisSessionStore (통합 — Redis 필요)', () => {
  let redis: RedisClient;

  beforeEach(async () => {
    redis = await testRedis(); // 전용 test DB를 FLUSHDB로 비워 테스트 간 격리
  });

  const make = ({ ttlMs }: { ttlMs: number }) => {
    const users = new InMemoryUserStore();
    return { users, sessions: new RedisSessionStore({ redis, users, ttlMs }) };
  };

  it('세션을 생성/조회/무효화한다', async () => {
    const { users, sessions } = make({ ttlMs: 60_000 });
    const user = await users.create(INPUT);

    const session = await sessions.create(user.id);
    expect(await sessions.get(session.token)).toEqual(session);

    await sessions.revoke(session.token);
    expect(await sessions.get(session.token)).toBeNull();
  });

  it('getWithUser는 조인 없이 세션+유저 스냅샷을 돌려준다 (DB 0회)', async () => {
    const { users, sessions } = make({ ttlMs: 60_000 });
    const user = await users.create(INPUT);
    const session = await sessions.create(user.id);

    expect(await sessions.getWithUser(session.token)).toEqual({ session, user });
    expect(await sessions.getWithUser('unknown-token')).toBeNull();
  });

  it('네이티브 TTL이 만료 세션을 자동 evict한다 (deleteExpired는 no-op)', async () => {
    const { users, sessions } = make({ ttlMs: 30 });
    const user = await users.create(INPUT);
    const session = await sessions.create(user.id);

    await Bun.sleep(60);
    expect(await sessions.get(session.token)).toBeNull();
    expect(await sessions.deleteExpired()).toBe(0);
  });
});
