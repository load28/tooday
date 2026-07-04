import type { DatabaseSchema } from '@bff/platform/db/schema';
import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';

/**
 * 개발·테스트 경로 — 임베디드 PostgreSQL(PGlite, WASM). 서버 설치 없이
 * 프로덕션과 동일한 Postgres SQL·마이그레이션을 실행한다.
 * dataDir 'memory://'는 인메모리(테스트), 파일 경로는 로컬 영속(개발).
 */
export async function createPgliteDatabase(dataDir: string): Promise<Kysely<DatabaseSchema>> {
  const { dialect } = await KyselyPGlite.create(dataDir);
  return new Kysely<DatabaseSchema>({ dialect });
}
