import { createApp } from '@bff/app';
import { SqlUserStore } from '@bff/modules/auth/adapters/sql';
import { createSessionStore } from '@bff/modules/auth/session-store';
import { startSessionSweep } from '@bff/modules/auth/session-sweeper';
import { SqlProjectStore, SqlTaskStore } from '@bff/modules/task/adapters/sql';
import { loadConfig } from '@bff/platform/config';
import { migrateToLatest } from '@bff/platform/db/migrate';
import { createPgliteDatabase } from '@bff/platform/db/pglite';
import { createPostgresDatabase } from '@bff/platform/db/postgres';
import { createLogger } from '@bff/platform/logging';
import { InMemorySyncBroker } from '@bff/platform/sync-broker';

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

const users = new SqlUserStore(db);
const { sessions, backend, needsExpirySweep } = createSessionStore({
  redisUrl: config.redisUrl,
  db,
  users,
  ttlMs: config.sessionTtlMs,
});
logger.info('session_store_ready', { backend });
if (needsExpirySweep) {
  await startSessionSweep({ sessions, logger });
}

const app = createApp({
  config,
  users,
  sessions,
  tasks: new SqlTaskStore(db),
  projects: new SqlProjectStore(db),
  sync: new InMemorySyncBroker(),
  logger,
});

export type { AppType } from '@bff/app';
export type { AppRouter } from '@bff/trpc/router';

export default {
  port: config.port,
  fetch: app.fetch,
};
