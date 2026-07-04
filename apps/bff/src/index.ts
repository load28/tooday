import { createApp } from '@bff/app';
import { SqlSessionStore, SqlUserStore } from '@bff/modules/auth/adapters/sql';
import { SqlProjectStore, SqlTaskStore } from '@bff/modules/task/adapters/sql';
import { loadConfig } from '@bff/platform/config';
import { migrateToLatest } from '@bff/platform/db/migrate';
import { createPgliteDatabase } from '@bff/platform/db/pglite';
import { createPostgresDatabase } from '@bff/platform/db/postgres';
import { createLogger } from '@bff/platform/logging';

const config = loadConfig();
const logger = createLogger(config.logFormat);

const db = config.databaseUrl
  ? createPostgresDatabase({ url: config.databaseUrl, poolSize: config.pgPoolSize })
  : await createPgliteDatabase(config.pgliteDataDir);
const { applied } = await migrateToLatest(db);
logger.info('database_ready', {
  engine: config.databaseUrl ? 'postgres' : 'pglite',
  migrationsApplied: applied,
});

const sessions = new SqlSessionStore({ db, ttlMs: config.sessionTtlMs });

// 만료 세션 청소 — 조회 경로에 걸리지 않는 행이 누적되지 않도록 부팅 시 1회 + 주기 배치
const SESSION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
async function sweepExpiredSessions(): Promise<void> {
  try {
    const deleted = await sessions.deleteExpired();
    if (deleted > 0) logger.info('sessions_swept', { deleted });
  } catch (error) {
    logger.error('session_sweep_failed', { message: error instanceof Error ? error.message : String(error) });
  }
}
await sweepExpiredSessions();
setInterval(() => void sweepExpiredSessions(), SESSION_SWEEP_INTERVAL_MS);

const app = createApp({
  config,
  users: new SqlUserStore(db),
  sessions,
  tasks: new SqlTaskStore(db),
  projects: new SqlProjectStore(db),
  logger,
});

export type { AppType } from '@bff/app';
export type { AppRouter } from '@bff/trpc/router';

export default {
  port: config.port,
  fetch: app.fetch,
};
