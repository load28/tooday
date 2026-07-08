import { createApp } from '@bff/app';
import { createAccessTokenService } from '@bff/modules/auth/access-token';
import { SqlUserStore } from '@bff/modules/auth/adapters/sql';
import { createRefreshTokenStore } from '@bff/modules/auth/refresh-token-store';
import { startRefreshTokenSweep } from '@bff/modules/auth/refresh-token-sweeper';
import { SqlProjectStore, SqlTaskStore } from '@bff/modules/task/adapters/sql';
import { SqlUserReader } from '@bff/modules/user/adapters/sql';
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
const accessTokens = createAccessTokenService({ secret: config.jwtSecret, ttlMs: config.accessTtlMs });
const {
  store: refreshTokens,
  backend,
  needsExpirySweep,
} = createRefreshTokenStore({
  redisUrl: config.redisUrl,
  db,
  idleTtlMs: config.refreshIdleTtlMs,
  absoluteTtlMs: config.refreshAbsoluteTtlMs,
});
logger.info('refresh_token_store_ready', { backend });
if (needsExpirySweep) {
  await startRefreshTokenSweep({ store: refreshTokens, logger });
}

const app = createApp({
  config,
  users,
  userReader: new SqlUserReader(db),
  refreshTokens,
  accessTokens,
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
