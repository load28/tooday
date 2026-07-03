import { createApp } from '@bff/app';
import { SqlSessionStore, SqlUserStore } from '@bff/auth/adapters/sql';
import { loadConfig } from '@bff/config';
import { migrate } from '@bff/db/migrate';
import { createSqliteDatabase } from '@bff/db/sqlite';
import { createLogger } from '@bff/logging';

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
