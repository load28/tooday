import type { BffConfig } from '@bff/config';
import { serialize } from 'hono/utils/cookie';

const WEEK_SECONDS = 7 * 24 * 60 * 60;

export const DEFAULT_SESSION_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  sameSite: 'Lax',
  path: '/',
  secure: true,
  maxAge: WEEK_SECONDS,
} as const;

export function serializeSessionCookie({ config, token }: { config: BffConfig; token: string }): string {
  return serialize(config.cookieName, token, {
    ...DEFAULT_SESSION_COOKIE_ATTRIBUTES,
    secure: config.cookieSecure,
    maxAge: Math.floor(config.sessionTtlMs / 1000),
  });
}

export function serializeSessionCookieRemoval(config: BffConfig): string {
  return serialize(config.cookieName, '', { path: DEFAULT_SESSION_COOKIE_ATTRIBUTES.path, maxAge: 0 });
}
