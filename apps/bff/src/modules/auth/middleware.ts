import type { AuthGateway } from '@bff/modules/auth/ports';
import { extractAccessToken } from '@bff/modules/auth/token';
import { DOMAIN_ERROR_CODES, domainErrorMessage } from '@bff/platform/errors';
import { errorResponse } from '@bff/platform/http';
import { createMiddleware } from 'hono/factory';

export interface RequireAuthDeps {
  auth: AuthGateway;
  cookieName: string;
}

/** 인증된 라우트가 c.get('auth')로 userId를 꺼내 쓰게 하는 Hono 변수 타입 */
export type AuthedEnv = {
  Variables: { auth: { userId: string } };
};

/**
 * tRPC 밖의 Hono 라우트(SSE 등)용 인증 가드.
 * protectedProcedure와 동일한 규칙(게이트웨이 verifyAccessToken → 미인증 시 401)을
 * 공유해, 인증 로직이 두 벌로 갈라지지 않게 한다.
 */
export function requireAuth({ auth, cookieName }: RequireAuthDeps) {
  return createMiddleware<AuthedEnv>(async (c, next) => {
    const token = extractAccessToken({ c, cookieName });
    const userId = await auth.verifyAccessToken(token);
    if (!userId) {
      return errorResponse({
        c,
        status: 401,
        code: DOMAIN_ERROR_CODES.UNAUTHENTICATED,
        message: domainErrorMessage(DOMAIN_ERROR_CODES.UNAUTHENTICATED),
      });
    }
    c.set('auth', { userId });
    await next();
  });
}
