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

  it('revoke는 계보 전체를 무효화한다 (로그아웃)', async () => {
    const store = make({ idleTtlMs: 60_000, absoluteTtlMs: 120_000 });
    const t1 = await store.issue(USER_ID);
    const t2 = await store.rotate(t1.token);
    if (!t2) throw new Error('회전이 실패했다');

    await store.revoke(t2.token);
    expect(await store.rotate(t2.token)).toBeNull();
  });

  it('회전된 옛 토큰을 재사용하면 계보 전체가 무효화된다 (재사용 탐지)', async () => {
    const store = make({ idleTtlMs: 60_000, absoluteTtlMs: 120_000 });
    const t1 = await store.issue(USER_ID);
    const t2 = await store.rotate(t1.token);
    if (!t2) throw new Error('회전이 실패했다');
    expect(t2.familyId).toBe(t1.familyId);

    expect(await store.rotate(t1.token)).toBeNull(); // 옛 토큰 재사용 → 탈취 신호
    expect(await store.rotate(t2.token)).toBeNull(); // 활성이던 t2도 함께 죽음
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
