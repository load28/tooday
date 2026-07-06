import { createApp } from '@bff/app';
import { RedisSessionStore } from '@bff/modules/auth/adapters/redis';
import { SqlSessionStore, SqlUserStore } from '@bff/modules/auth/adapters/sql';
import { SqlProjectStore, SqlTaskStore } from '@bff/modules/task/adapters/sql';
import { loadConfig } from '@bff/platform/config';
import { migrateToLatest } from '@bff/platform/db/migrate';
import { createPgliteDatabase } from '@bff/platform/db/pglite';
import { createPostgresDatabase } from '@bff/platform/db/postgres';
import { createLogger } from '@bff/platform/logging';
import { InMemorySyncBroker } from '@bff/platform/sync-broker';
import { RedisClient } from 'bun';

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

// REDIS_URL이 있으면 세션은 Redis(네이티브 TTL — 스윕 불필요), 없으면 DB 세션 테이블.
// DATABASE_URL로 postgres/pglite를 고르는 것과 같은 opt-in 패턴이라 개발은 외부 의존성 0.
const sessions = config.redisUrl
  ? new RedisSessionStore({ redis: new RedisClient(config.redisUrl), users, ttlMs: config.sessionTtlMs })
  : new SqlSessionStore({ db, ttlMs: config.sessionTtlMs });
logger.info('session_store_ready', { backend: config.redisUrl ? 'redis' : 'sql' });

// 만료 세션 청소 — SQL 백엔드에서만 필요하다(Redis는 네이티브 TTL이 자동 evict, deleteExpired가 no-op).
// 조회 경로에 걸리지 않는 행이 누적되지 않도록 부팅 시 1회 + 주기 배치.
if (!config.redisUrl) {
  const SESSION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
  const sweepExpiredSessions = async (): Promise<void> => {
    try {
      const deleted = await sessions.deleteExpired();
      if (deleted > 0) logger.info('sessions_swept', { deleted });
    } catch (error) {
      logger.error('session_sweep_failed', { message: error instanceof Error ? error.message : String(error) });
    }
  };
  await sweepExpiredSessions();
  setInterval(() => void sweepExpiredSessions(), SESSION_SWEEP_INTERVAL_MS);
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
