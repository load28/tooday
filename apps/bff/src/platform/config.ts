import type { LogFormat } from '@bff/platform/logging';

export interface BffConfig {
  port: number;
  allowedOrigins: string[];
  cookieName: string;
  cookieSecure: boolean;
  sessionTtlMs: number;
  /** PostgreSQL 연결 문자열. 미설정이면 임베디드 PGlite(개발·테스트)로 동작한다. */
  databaseUrl: string | null;
  /** PGlite 데이터 디렉토리 — 'memory://'는 인메모리 */
  pgliteDataDir: string;
  pgPoolSize: number;
  /** Redis 연결 문자열. 설정 시 세션 저장소로 Redis를 쓴다(미설정이면 DB 세션 테이블). */
  redisUrl: string | null;
  logFormat: LogFormat;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function loadConfig(env: Record<string, string | undefined> = process.env): BffConfig {
  const isProduction = env.NODE_ENV === 'production';
  return {
    port: Number(env.BFF_PORT ?? 3002),
    allowedOrigins: (env.BFF_ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    cookieName: env.BFF_SESSION_COOKIE ?? 'tooday_session',
    cookieSecure: isProduction,
    sessionTtlMs: Number(env.BFF_SESSION_TTL_MS ?? WEEK_MS),
    databaseUrl: env.DATABASE_URL ?? null,
    pgliteDataDir: env.BFF_PGLITE_DIR ?? '.data/pglite',
    pgPoolSize: Number(env.BFF_PG_POOL_SIZE ?? 10),
    redisUrl: env.REDIS_URL ?? null,
    logFormat:
      env.BFF_LOG_FORMAT === 'json' || env.BFF_LOG_FORMAT === 'pretty' ? env.BFF_LOG_FORMAT : isProduction ? 'json' : 'pretty',
  };
}
