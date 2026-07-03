import { createApp } from '@bff/app';
import { SqlSessionStore, SqlUserStore } from '@bff/modules/auth/adapters/sql';
import { loadConfig } from '@bff/platform/config';
import { migrate } from '@bff/platform/db/migrate';
import { createSqliteDatabase } from '@bff/platform/db/sqlite';
import { createLogger } from '@bff/platform/logging';

const config = loadConfig();
const logger = createLogger(config.logFormat);

const db = createSqliteDatabase(config.databasePath);
await migrate(db);
logger.info('database_ready', { path: config.databasePath });

const app = createApp({
  config,
  users: new SqlUserStore(db),
  sessions: new SqlSessionStore({ db, ttlMs: config.sessionTtlMs }),
  logger,
});

export type { AppType } from '@bff/app';
export type { AppRouter } from '@bff/trpc/router';

export default {
  port: config.port,
  fetch: app.fetch,
};
