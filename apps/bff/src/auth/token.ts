import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';

/**
 * 세션 토큰 추출. 두 가지 방식을 모두 지원한다.
 * 1. Authorization: Bearer <token> 헤더 (네이티브/웹뷰 브릿지 클라이언트)
 * 2. httpOnly 쿠키 (웹 클라이언트) — 헤더가 없을 때 폴백
 */
export function extractSessionToken(c: Context, cookieName: string): string | null {
  const authorization = c.req.header('Authorization');
  if (authorization) {
    const [scheme, token] = authorization.split(/\s+/);
    if (scheme?.toLowerCase() === 'bearer' && token) return token;
  }
  return getCookie(c, cookieName) ?? null;
}
