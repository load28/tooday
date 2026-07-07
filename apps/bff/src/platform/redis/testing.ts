import { RedisClient } from 'bun';

/**
 * Redis 통합 테스트 전제 관리 — platform/db/testing.ts의 testDatabase()와 같은 역할.
 *
 * Redis는 외부 서버가 필요하므로(PGlite처럼 임베디드가 불가) REDIS_TEST_URL(우선) 또는
 * REDIS_URL이 있을 때만 돈다. 없으면 redisTestUrl이 null이고, 테스트는 이 값으로
 * 스킵을 선언한다 — `describe.skipIf(!redisTestUrl)`.
 *
 * 실 데이터와 섞이지 않도록 전용 논리 DB(index)로 강제하고, 호출 시 FLUSHDB로 비워
 * 테스트 간 격리를 보장한다(testDatabase의 truncate와 같은 위치).
 */
const TEST_DB_INDEX = 15;

export const redisTestUrl: string | null = resolveTestUrl();

function resolveTestUrl(): string | null {
  const raw = process.env.REDIS_TEST_URL ?? process.env.REDIS_URL;
  if (!raw) return null;
  // db 0(실 데이터)을 절대 FLUSH하지 않도록 URL 경로를 전용 인덱스로 덮는다.
  // (재접속 시에도 URL 기준으로 같은 db가 선택된다.)
  const url = new URL(raw);
  url.pathname = `/${TEST_DB_INDEX}`;
  return url.toString();
}

let shared: RedisClient | null = null;

/**
 * 격리된 Redis 클라이언트를 돌려준다. 클라이언트는 프로세스당 하나를 공유하고,
 * 호출마다 전용 DB를 SELECT + FLUSHDB해 이전 테스트의 잔여 키를 지운다.
 *
 * redisTestUrl이 null이면(스킵 가드를 우회해 호출된 경우) 즉시 던진다.
 */
export async function testRedis(): Promise<RedisClient> {
  if (!redisTestUrl) {
    throw new Error('testRedis()는 REDIS_TEST_URL/REDIS_URL이 설정됐을 때만 호출할 수 있다. redisTestUrl로 스킵을 가드하라.');
  }
  shared ??= new RedisClient(redisTestUrl);
  // URL에 db가 박혀 있어도, 재접속 등으로 db 0에 붙는 사고를 막는 이중 안전장치.
  await shared.send('SELECT', [String(TEST_DB_INDEX)]);
  await shared.send('FLUSHDB', []);
  return shared;
}
