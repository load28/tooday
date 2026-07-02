export interface BffConfig {
  port: number;
  allowedOrigins: string[];
  cookieName: string;
  cookieSecure: boolean;
  sessionTtlMs: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function loadConfig(env: Record<string, string | undefined> = process.env): BffConfig {
  return {
    port: Number(env.BFF_PORT ?? 3002),
    allowedOrigins: (env.BFF_ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    cookieName: env.BFF_SESSION_COOKIE ?? 'tooday_session',
    cookieSecure: env.NODE_ENV === 'production',
    sessionTtlMs: Number(env.BFF_SESSION_TTL_MS ?? WEEK_MS),
  };
}
