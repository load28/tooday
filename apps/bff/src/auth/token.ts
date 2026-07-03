import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';

/** Authorization: Bearer 헤더 우선, 없으면 httpOnly 쿠키 폴백 */
export function extractSessionToken({ c, cookieName }: { c: Context; cookieName: string }): string | null {
  const authorization = c.req.header('Authorization');
  if (authorization) {
    const [scheme, token] = authorization.split(/\s+/);
    if (scheme?.toLowerCase() === 'bearer' && token) return token;
  }
  return getCookie(c, cookieName) ?? null;
}
