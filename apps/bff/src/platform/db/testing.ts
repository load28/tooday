import { migrateToLatest } from '@bff/platform/db/migrate';
import { createPgliteDatabase } from '@bff/platform/db/pglite';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';

let shared: Promise<Kysely<DatabaseSchema>> | null = null;

/**
 * 테스트 전용 — PGlite 부팅(WASM 초기화)이 수 초라 프로세스당 인스턴스 하나를
 * 공유하고, 테스트 간 격리는 TRUNCATE로 한다.
 */
export async function testDatabase(): Promise<Kysely<DatabaseSchema>> {
  shared ??= (async () => {
    const db = await createPgliteDatabase('memory://');
    await migrateToLatest(db);
    return db;
  })();
  const db = await shared;
  await sql`truncate table tasks, projects, sessions, users cascade`.execute(db);
  return db;
}
