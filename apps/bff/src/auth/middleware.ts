import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { BffConfig } from '../config';
import { errorResponse } from '../http';
import type { AppEnv } from '../types';
import type { SessionStore } from './session-store';
import type { UserStore } from './user-store';

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

export interface AuthMiddlewareDeps {
  config: BffConfig;
  sessions: SessionStore;
  users: UserStore;
}

export function createAuthMiddleware({ config, sessions, users }: AuthMiddlewareDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = extractSessionToken(c, config.cookieName);
    if (!token) {
      return errorResponse(c, 401, 'UNAUTHORIZED', '인증 정보가 없습니다.');
    }
    const session = sessions.get(token);
    if (!session) {
      return errorResponse(c, 401, 'SESSION_EXPIRED', '세션이 만료되었거나 유효하지 않습니다.');
    }
    const user = users.findById(session.userId);
    if (!user) {
      sessions.revoke(token);
      return errorResponse(c, 401, 'UNAUTHORIZED', '사용자를 찾을 수 없습니다.');
    }
    c.set('user', user);
    c.set('sessionToken', token);
    await next();
  });
}
