import type { LogFormat } from '@bff/platform/logging';

export interface BffConfig {
  port: number;
  allowedOrigins: string[];
  cookieName: string;
  cookieSecure: boolean;
  sessionTtlMs: number;
  databasePath: string;
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
    databasePath: env.BFF_DATABASE_PATH ?? 'tooday.sqlite',
    logFormat:
      env.BFF_LOG_FORMAT === 'json' || env.BFF_LOG_FORMAT === 'pretty' ? env.BFF_LOG_FORMAT : isProduction ? 'json' : 'pretty',
  };
}
