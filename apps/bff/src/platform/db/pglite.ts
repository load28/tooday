import { mkdirSync } from 'node:fs';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';

/**
 * 개발·테스트 경로 — 임베디드 PostgreSQL(PGlite, WASM). 서버 설치 없이
 * 프로덕션과 동일한 Postgres SQL·마이그레이션을 실행한다.
 * dataDir 'memory://'는 인메모리(테스트), 파일 경로는 로컬 영속(개발).
 */
export async function createPgliteDatabase(dataDir: string): Promise<Kysely<DatabaseSchema>> {
  // PGlite NodeFS는 leaf만 비재귀로 mkdir 하므로, 파일 경로면 부모까지 미리 만든다.
  // 'memory://' 등 프로토콜 경로는 파일시스템 대상이 아니라 건너뛴다.
  if (!dataDir.includes('://')) {
    mkdirSync(dataDir, { recursive: true });
  }
  const { dialect } = await KyselyPGlite.create(dataDir);
  return new Kysely<DatabaseSchema>({ dialect });
}
