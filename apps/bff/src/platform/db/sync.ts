import type { DatabaseSchema } from '@bff/platform/db/schema';
import type { Kysely, Transaction } from 'kysely';
import { sql } from 'kysely';

/**
 * 동기화 seq 발급 하에 쓰기를 실행한다.
 *
 * 유저 단위 advisory lock으로 같은 유저의 쓰기를 직렬화한다 — seq 발급 순서와
 * 커밋 순서가 일치해야, 델타를 당기는 클라이언트가 "커서 사이에 낀 미커밋 행"을
 * 영영 놓치는 구멍이 안 생긴다. 잠금은 트랜잭션 커밋 시 자동 해제된다.
 * (한 유저의 쓰기 빈도는 사람 손 속도라 직렬화 비용은 사실상 0이다.)
 */
export async function withUserSyncSeq<T>(
  db: Kysely<DatabaseSchema>,
  userId: string,
  fn: (trx: Transaction<DatabaseSchema>, seq: number) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`select pg_advisory_xact_lock(hashtext(${userId}))`.execute(trx);
    const { rows } = await sql<{ seq: number }>`
      insert into sync_counters (user_id, seq) values (${userId}, 1)
      on conflict (user_id) do update set seq = sync_counters.seq + 1
      returning seq
    `.execute(trx);
    const seq = rows[0]?.seq;
    if (seq === undefined) throw new Error('sync seq 발급 실패');
    return fn(trx, seq);
  });
}

/** 유저의 현재 seq — 클라이언트 초기 커서. 카운터 행이 없으면(쓰기 전) 0 */
export async function currentSyncSeq(db: Kysely<DatabaseSchema>, userId: string): Promise<number> {
  const row = await db.selectFrom('sync_counters').select('seq').where('user_id', '=', userId).executeTakeFirst();
  return row?.seq ?? 0;
}
