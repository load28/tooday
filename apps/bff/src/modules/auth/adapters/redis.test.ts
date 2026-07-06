import { afterAll, describe, expect, it } from 'bun:test';
import { InMemoryUserStore } from '@bff/modules/auth/adapters/memory';
import { RedisSessionStore } from '@bff/modules/auth/adapters/redis';
import { RedisClient } from 'bun';

// Redis는 외부 의존성이라 REDIS_URL이 있을 때만 돈다. CI(미설정)에서는 통째로 스킵된다.
const redisUrl = process.env.REDIS_URL;
const INPUT = { email: 'redis-store@tooday.app', password: 'password123', name: '레디스' };

describe.skipIf(!redisUrl)('RedisSessionStore (통합 — REDIS_URL 필요)', () => {
  // biome-ignore lint/style/noNonNullAssertion: skipIf가 redisUrl 존재를 보장한다
  const redis = new RedisClient(redisUrl!);
  const createdTokens: string[] = [];

  const make = ({ ttlMs }: { ttlMs: number }) => {
    const users = new InMemoryUserStore();
    const sessions = new RedisSessionStore({ redis, users, ttlMs });
    // revoke가 지우는 것과 같은 키를 정리 목록에 쌓아 테스트 간 누수를 막는다.
    const trackedCreate = sessions.create.bind(sessions);
    sessions.create = async (userId: string) => {
      const session = await trackedCreate(userId);
      createdTokens.push(session.token);
      return session;
    };
    return { users, sessions };
  };

  afterAll(async () => {
    for (const token of createdTokens) {
      await new RedisSessionStore({ redis, users: new InMemoryUserStore(), ttlMs: 0 }).revoke(token);
    }
    redis.close();
  });

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
    const user = await users.create({ ...INPUT, email: 'redis-join@tooday.app' });
    const session = await sessions.create(user.id);

    expect(await sessions.getWithUser(session.token)).toEqual({ session, user });
    expect(await sessions.getWithUser('unknown-token')).toBeNull();
  });

  it('네이티브 TTL이 만료 세션을 자동 evict한다 (deleteExpired는 no-op)', async () => {
    const { users, sessions } = make({ ttlMs: 30 });
    const user = await users.create({ ...INPUT, email: 'redis-ttl@tooday.app' });
    const session = await sessions.create(user.id);

    await Bun.sleep(60);
    expect(await sessions.get(session.token)).toBeNull();
    expect(await sessions.deleteExpired()).toBe(0);
  });
});
