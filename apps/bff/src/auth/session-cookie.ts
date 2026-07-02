import { serialize } from 'hono/utils/cookie';
import type { BffConfig } from '../config';

export const DEFAULT_SESSION_COOKIE_NAME = 'tooday_session';

export const SESSION_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  sameSite: 'Lax',
  path: '/',
} as const;

export function serializeSessionCookie(config: BffConfig, token: string): string {
  return serialize(config.cookieName, token, {
    ...SESSION_COOKIE_ATTRIBUTES,
    secure: config.cookieSecure,
    maxAge: Math.floor(config.sessionTtlMs / 1000),
  });
}

export function serializeSessionCookieRemoval(config: BffConfig): string {
  return serialize(config.cookieName, '', { path: SESSION_COOKIE_ATTRIBUTES.path, maxAge: 0 });
}
