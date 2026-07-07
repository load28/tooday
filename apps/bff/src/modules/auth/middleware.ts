import type { AccessTokenService } from '@bff/modules/auth/access-token';
import type { RefreshTokenStore } from '@bff/modules/auth/ports';
import { verifyLiveSession } from '@bff/modules/auth/session-liveness';
import { extractAccessToken } from '@bff/modules/auth/token';
import { errorResponse } from '@bff/platform/http';
import { createMiddleware } from 'hono/factory';

export interface RequireAuthDeps {
  accessTokens: AccessTokenService;
  refreshTokens: RefreshTokenStore;
  cookieName: string;
}

/** 인증된 라우트가 c.get('auth')로 userId를 꺼내 쓰게 하는 Hono 변수 타입 */
export type AuthedEnv = {
  Variables: { auth: { userId: string } };
};

/**
 * tRPC 밖의 Hono 라우트(SSE 등)용 인증 가드.
 * protectedProcedure와 동일한 규칙(액세스 JWT 검증 + 세션 라이브니스 → 미인증 시 401)을
 * verifyLiveSession으로 공유해, 인증 로직이 두 벌로 갈라지지 않게 한다.
 */
export function requireAuth({ accessTokens, refreshTokens, cookieName }: RequireAuthDeps) {
  return createMiddleware<AuthedEnv>(async (c, next) => {
    const token = extractAccessToken({ c, cookieName });
    const userId = await verifyLiveSession({ token, accessTokens, refreshTokens });
    if (!userId) {
      return errorResponse({ c, status: 401, code: 'UNAUTHENTICATED', message: '인증이 필요합니다.' });
    }
    c.set('auth', { userId });
    await next();
  });
}
