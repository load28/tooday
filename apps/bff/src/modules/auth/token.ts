import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';

/**
 * 액세스 토큰(JWT) 추출 — Authorization: Bearer 헤더 우선(네이티브/웹뷰 브릿지),
 * 없으면 httpOnly 액세스 쿠키(웹).
 */
export function extractAccessToken({ c, cookieName }: { c: Context; cookieName: string }): string | null {
  const authorization = c.req.header('Authorization');
  if (authorization) {
    const [scheme, token] = authorization.split(/\s+/);
    if (scheme?.toLowerCase() === 'bearer' && token) return token;
  }
  return getCookie(c, cookieName) ?? null;
}
