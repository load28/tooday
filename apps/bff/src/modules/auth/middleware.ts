import type { AccessTokenService } from '@bff/modules/auth/access-token';
import { extractAccessToken } from '@bff/modules/auth/token';
import { errorResponse } from '@bff/platform/http';
import { createMiddleware } from 'hono/factory';

export interface RequireAuthDeps {
  accessTokens: AccessTokenService;
  cookieName: string;
}

/** 인증된 라우트가 c.get('auth')로 userId를 꺼내 쓰게 하는 Hono 변수 타입 */
export type AuthedEnv = {
  Variables: { auth: { userId: string } };
};

/**
 * tRPC 밖의 Hono 라우트(SSE 등)용 인증 가드.
 * protectedProcedure와 동일한 규칙(액세스 토큰 추출 → JWT 검증 → 미인증 시 401)을
 * 공유해, 인증 로직이 tRPC 컨텍스트와 두 벌로 갈라지지 않게 한다.
 */
export function requireAuth({ accessTokens, cookieName }: RequireAuthDeps) {
  return createMiddleware<AuthedEnv>(async (c, next) => {
    const token = extractAccessToken({ c, cookieName });
    const userId = token ? await accessTokens.verify(token) : null;
    if (!userId) {
      return errorResponse({ c, status: 401, code: 'UNAUTHENTICATED', message: '인증이 필요합니다.' });
    }
    c.set('auth', { userId });
    await next();
  });
}
