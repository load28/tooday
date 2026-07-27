import type { AccessTokenService } from '@bff/modules/auth/access-token';
import { serializeAccessCookie, serializeAuthCookieRemovals, serializeRefreshCookie } from '@bff/modules/auth/cookies';
import type { RefreshTokenStore } from '@bff/modules/auth/ports';
import { verifyLiveSession } from '@bff/modules/auth/session-liveness';
import { extractAccessToken } from '@bff/modules/auth/token';
import type { BffConfig } from '@bff/platform/config';
import type { TokenPair } from '@tooday/shared';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Context as HonoContext } from 'hono';
import { getCookie } from 'hono/cookie';

export type TrpcContext = {
  /** 액세스 JWT 검증 결과. pub.* 프로시저는 참조 금지(응답이 공유 캐시에 저장된다). */
  userId: string | null;
  /**
   * 요청에 인증 자격증명이 실렸는지 — 액세스 토큰(Bearer 헤더/쿠키) 또는 리프레시 쿠키.
   * userId가 null일 때 401(무효 → refresh 챌린지)과 200+null(익명)을 가르는 신호다.
   */
  hasCredential: boolean;
  /** 리프레시 쿠키 — auth.refresh(회전)와 logout(폐기)용 */
  refreshToken: string | null;
  setAuthCookies: (tokens: TokenPair) => void;
  clearAuthCookies: () => void;
};

export interface TrpcContextDeps {
  config: BffConfig;
  accessTokens: AccessTokenService;
  refreshTokens: RefreshTokenStore;
}

export function createContextFactory({ config, accessTokens, refreshTokens }: TrpcContextDeps) {
  return async (opts: FetchCreateContextFnOptions, c: HonoContext): Promise<TrpcContext> => {
    // 인증 핫패스 — 액세스 JWT 검증 + 세션 라이브니스 체크(즉시 무효화). 유저 조회는 안 탐.
    const accessToken = extractAccessToken({ c, cookieName: config.accessCookieName });
    const userId = await verifyLiveSession({ token: accessToken, accessTokens, refreshTokens });
    const refreshToken = getCookie(c, config.refreshCookieName) ?? null;

    return {
      userId,
      hasCredential: accessToken !== null || refreshToken !== null,
      refreshToken,
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
