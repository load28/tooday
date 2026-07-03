import { Database } from 'bun:sqlite';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import { Kysely } from 'kysely';
import { BunSqliteDialect } from 'kysely-bun-sqlite';

/** 엔진 교체(postgres 등)는 다른 다이얼렉트로 Kysely를 만드는 팩토리를 추가하면 된다 */
export function createSqliteDatabase(path: string): Kysely<DatabaseSchema> {
  const database = new Database(path);
  database.exec('PRAGMA journal_mode = WAL;');
  database.exec('PRAGMA foreign_keys = ON;');
  return new Kysely<DatabaseSchema>({ dialect: new BunSqliteDialect({ database }) });
}
