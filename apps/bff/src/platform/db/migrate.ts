import { StaticMigrationProvider } from '@bff/platform/db/migrations';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import type { Kysely } from 'kysely';
import { Migrator } from 'kysely';

/**
 * 버전드 마이그레이션 실행. Migrator가 이력 테이블(kysely_migration)과
 * 잠금 테이블로 적용 여부·동시 실행을 관리하므로 부팅 시 항상 호출해도 안전하다.
 */
export async function migrateToLatest(db: Kysely<DatabaseSchema>): Promise<{ applied: string[] }> {
  const migrator = new Migrator({ db, provider: new StaticMigrationProvider() });
  const { error, results } = await migrator.migrateToLatest();
  if (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
  return { applied: (results ?? []).filter((r) => r.status === 'Success').map((r) => r.migrationName) };
}
