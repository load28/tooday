import type { SessionStore, SessionWithUser } from '@bff/modules/auth/ports';
import { extractSessionToken } from '@bff/modules/auth/token';
import { errorResponse } from '@bff/platform/http';
import { createMiddleware } from 'hono/factory';

export interface RequireAuthDeps {
  sessions: SessionStore;
  cookieName: string;
}

/** 인증된 라우트가 c.get('auth')로 세션+유저를 꺼내 쓰게 하는 Hono 변수 타입 */
export type AuthedEnv = {
  Variables: { auth: SessionWithUser };
};

/**
 * tRPC 밖의 Hono 라우트(SSE 등)용 인증 가드.
 * protectedProcedure와 동일한 규칙(토큰 추출 → 세션+유저 단일 조회 → 미인증 시 401)을
 * 공유해, 인증 로직이 tRPC 컨텍스트와 두 벌로 갈라지지 않게 한다.
 */
export function requireAuth({ sessions, cookieName }: RequireAuthDeps) {
  return createMiddleware<AuthedEnv>(async (c, next) => {
    const token = extractSessionToken({ c, cookieName });
    const auth = token ? await sessions.getWithUser(token) : null;
    if (!auth) {
      return errorResponse({ c, status: 401, code: 'UNAUTHENTICATED', message: '인증이 필요합니다.' });
    }
    c.set('auth', auth);
    await next();
  });
}
