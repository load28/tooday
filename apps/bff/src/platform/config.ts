import type { LogFormat } from '@bff/platform/logging';

export interface BffConfig {
  port: number;
  allowedOrigins: string[];
  accessCookieName: string;
  refreshCookieName: string;
  cookieSecure: boolean;
  /** 액세스 JWT 서명 시크릿(HS256). 프로덕션에서는 필수. */
  jwtSecret: string;
  /** 액세스 토큰 수명 — 짧다. 만료 시 리프레시로 재발급. */
  accessTtlMs: number;
  /** 리프레시 idle 수명(슬라이딩) — 회전할 때마다 이만큼 다시 연장된다. */
  refreshIdleTtlMs: number;
  /** 리프레시 절대 수명(하드캡) — 로그인 시 박히고 회전해도 안 늘어난다. */
  refreshAbsoluteTtlMs: number;
  /** PostgreSQL 연결 문자열. 미설정이면 임베디드 PGlite(개발·테스트)로 동작한다. */
  databaseUrl: string | null;
  /** PGlite 데이터 디렉토리 — 'memory://'는 인메모리 */
  pgliteDataDir: string;
  pgPoolSize: number;
  /** Redis 연결 문자열. 설정 시 리프레시 토큰 저장소로 Redis를 쓴다(미설정이면 DB 테이블). */
  redisUrl: string | null;
  logFormat: LogFormat;
  /** 요청 로거를 붙일지 — 테스트에서는 로그 소음을 없애려 끈다. */
  logRequests: boolean;
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEV_JWT_SECRET = 'tooday-dev-insecure-jwt-secret-change-me';

export function loadConfig(env: Record<string, string | undefined> = process.env): BffConfig {
  const isProduction = env.NODE_ENV === 'production';
  const jwtSecret = env.BFF_JWT_SECRET ?? '';
  if (isProduction && !jwtSecret) {
    throw new Error('BFF_JWT_SECRET는 프로덕션에서 필수다 (액세스 토큰 서명 키).');
  }
  return {
    port: Number(env.BFF_PORT ?? 3002),
    allowedOrigins: (env.BFF_ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    accessCookieName: env.BFF_ACCESS_COOKIE ?? 'tooday_access',
    refreshCookieName: env.BFF_REFRESH_COOKIE ?? 'tooday_refresh',
    cookieSecure: isProduction,
    jwtSecret: jwtSecret || DEV_JWT_SECRET,
    accessTtlMs: Number(env.BFF_ACCESS_TTL_MS ?? 15 * MINUTE_MS),
    refreshIdleTtlMs: Number(env.BFF_REFRESH_IDLE_TTL_MS ?? 14 * DAY_MS),
    refreshAbsoluteTtlMs: Number(env.BFF_REFRESH_ABSOLUTE_TTL_MS ?? 90 * DAY_MS),
    databaseUrl: env.DATABASE_URL ?? null,
    pgliteDataDir: env.BFF_PGLITE_DIR ?? '.data/pglite',
    pgPoolSize: Number(env.BFF_PG_POOL_SIZE ?? 10),
    redisUrl: env.REDIS_URL ?? null,
    logFormat:
      env.BFF_LOG_FORMAT === 'json' || env.BFF_LOG_FORMAT === 'pretty' ? env.BFF_LOG_FORMAT : isProduction ? 'json' : 'pretty',
    logRequests: env.NODE_ENV !== 'test',
  };
}
