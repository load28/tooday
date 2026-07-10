import { serializeAccessCookie, serializeAuthCookieRemovals, serializeRefreshCookie } from '@bff/modules/auth/cookies';
import type { AuthGateway } from '@bff/modules/auth/ports';
import { extractAccessToken } from '@bff/modules/auth/token';
import type { BffConfig } from '@bff/platform/config';
import type { TokenPair } from '@tooday/shared';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Context as HonoContext } from 'hono';
import { getCookie } from 'hono/cookie';

export type TrpcContext = {
  /** 액세스 JWT 검증 결과. pub.* 프로시저는 참조 금지(응답이 공유 캐시에 저장된다). */
  userId: string | null;
  /** 리프레시 쿠키 — auth.refresh(회전)와 logout(폐기)용 */
  refreshToken: string | null;
  setAuthCookies: (tokens: TokenPair) => void;
  clearAuthCookies: () => void;
};

export interface TrpcContextDeps {
  config: BffConfig;
  auth: AuthGateway;
}

export function createContextFactory({ config, auth }: TrpcContextDeps) {
  return async (opts: FetchCreateContextFnOptions, c: HonoContext): Promise<TrpcContext> => {
    // 인증 핫패스 — 검증(JWT + 세션 라이브니스)의 실제 동작은 러스트 API가 소유한다.
    const accessToken = extractAccessToken({ c, cookieName: config.accessCookieName });
    const userId = await auth.verifyAccessToken(accessToken);

    return {
      userId,
      refreshToken: getCookie(c, config.refreshCookieName) ?? null,
      setAuthCookies: (tokens) => {
        opts.resHeaders.append('set-cookie', serializeAccessCookie({ config, token: tokens.accessToken }));
        opts.resHeaders.append('set-cookie', serializeRefreshCookie({ config, token: tokens.refreshToken }));
      },
      clearAuthCookies: () => {
        for (const removal of serializeAuthCookieRemovals(config)) {
          opts.resHeaders.append('set-cookie', removal);
        }
      },
    };
  };
}
