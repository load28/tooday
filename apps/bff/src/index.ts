import { createApp } from './app';
import { SqlSessionStore, SqlUserStore } from './auth/adapters/sql';
import { loadConfig } from './config';
import { migrate } from './db/migrate';
import { createSqliteDatabase } from './db/sqlite';
import { createLogger } from './logging';

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

export type { AppType } from './app';
export type { AppRouter } from './trpc/router';

export default {
  port: config.port,
  fetch: app.fetch,
};
