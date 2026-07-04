import type { DatabaseSchema } from '@bff/platform/db/schema';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

/** 배포 경로 — 커넥션 풀 기반 PostgreSQL. DATABASE_URL로 선택된다. */
export function createPostgresDatabase({ url, poolSize }: { url: string; poolSize: number }): Kysely<DatabaseSchema> {
  const pool = new pg.Pool({ connectionString: url, max: poolSize });
  return new Kysely<DatabaseSchema>({ dialect: new PostgresDialect({ pool }) });
}
