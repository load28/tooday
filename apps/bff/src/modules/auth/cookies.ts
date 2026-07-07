import type { BffConfig } from '@bff/platform/config';
import { serialize } from 'hono/utils/cookie';

const BASE_ATTRIBUTES = {
  httpOnly: true,
  sameSite: 'Lax',
  path: '/',
} as const;

function serializeAuthCookie({
  name,
  value,
  config,
  maxAgeMs,
}: {
  name: string;
  value: string;
  config: BffConfig;
  maxAgeMs: number;
}): string {
  return serialize(name, value, {
    ...BASE_ATTRIBUTES,
    secure: config.cookieSecure,
    maxAge: Math.floor(maxAgeMs / 1000),
  });
}

/** 액세스 쿠키 — 짧다(액세스 TTL). 매 요청 인증에 쓰인다. */
export function serializeAccessCookie({ config, token }: { config: BffConfig; token: string }): string {
  return serializeAuthCookie({ name: config.accessCookieName, value: token, config, maxAgeMs: config.accessTtlMs });
}

/** 리프레시 쿠키 — 길다(absolute 하드캡까지). idle 만료는 서버가 판단한다. */
export function serializeRefreshCookie({ config, token }: { config: BffConfig; token: string }): string {
  return serializeAuthCookie({ name: config.refreshCookieName, value: token, config, maxAgeMs: config.refreshAbsoluteTtlMs });
}

function serializeRemoval(name: string): string {
  return serialize(name, '', { path: BASE_ATTRIBUTES.path, maxAge: 0 });
}

/** 로그아웃 — 액세스·리프레시 쿠키를 함께 지운다. */
export function serializeAuthCookieRemovals(config: BffConfig): string[] {
  return [serializeRemoval(config.accessCookieName), serializeRemoval(config.refreshCookieName)];
}
