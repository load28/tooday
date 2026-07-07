import { beforeEach, describe, expect, it } from 'bun:test';
import { RedisRefreshTokenStore } from '@bff/modules/auth/adapters/redis';
import { redisTestUrl, testRedis } from '@bff/platform/redis/testing';
import type { RedisClient } from 'bun';

const USER_ID = '00000000-0000-0000-0000-000000000001';

// 전제(연결·격리)는 testRedis()가 관리한다. 여기선 redisTestUrl로 스킵만 선언한다.
describe.skipIf(!redisTestUrl)('RedisRefreshTokenStore (통합 — Redis 필요)', () => {
  let redis: RedisClient;

  beforeEach(async () => {
    redis = await testRedis(); // 전용 test DB를 FLUSHDB로 비워 테스트 간 격리
  });

  const make = ({ idleTtlMs, absoluteTtlMs }: { idleTtlMs: number; absoluteTtlMs: number }) =>
    new RedisRefreshTokenStore({ redis, idleTtlMs, absoluteTtlMs });

  it('발급 후 회전하면 새 토큰을 주고 옛 토큰을 폐기한다', async () => {
    const store = make({ idleTtlMs: 60_000, absoluteTtlMs: 120_000 });
    const issued = await store.issue(USER_ID);

    const rotated = await store.rotate(issued.token);
    expect(rotated?.userId).toBe(USER_ID);
    expect(rotated?.token).not.toBe(issued.token);
    expect(await store.rotate(issued.token)).toBeNull(); // 옛 토큰 재사용 불가
  });

  it('revoke하면 회전할 수 없다', async () => {
    const store = make({ idleTtlMs: 60_000, absoluteTtlMs: 120_000 });
    const issued = await store.issue(USER_ID);
    await store.revoke(issued.token);
    expect(await store.rotate(issued.token)).toBeNull();
  });

  it('네이티브 TTL이 idle 만료 토큰을 자동 evict한다 (deleteExpired는 no-op)', async () => {
    const store = make({ idleTtlMs: 30, absoluteTtlMs: 120_000 });
    const issued = await store.issue(USER_ID);

    await Bun.sleep(60);
    expect(await store.rotate(issued.token)).toBeNull();
    expect(await store.deleteExpired()).toBe(0);
  });

  it('absolute 하드캡을 넘긴 토큰은 회전되지 않는다', async () => {
    const store = make({ idleTtlMs: 60_000, absoluteTtlMs: -1 });
    const issued = await store.issue(USER_ID);
    expect(await store.rotate(issued.token)).toBeNull();
  });
});
