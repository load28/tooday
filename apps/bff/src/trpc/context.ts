import type { AccessTokenService } from '@bff/modules/auth/access-token';
import { serializeAccessCookie, serializeAuthCookieRemovals, serializeRefreshCookie } from '@bff/modules/auth/cookies';
import type { UserStore } from '@bff/modules/auth/ports';
import { extractAccessToken } from '@bff/modules/auth/token';
import type { BffConfig } from '@bff/platform/config';
import type { TokenPair, User } from '@tooday/shared';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Context as HonoContext } from 'hono';
import { getCookie } from 'hono/cookie';

export type TrpcContext = {
  /** 액세스 JWT 검증 결과. pub.* 프로시저는 참조 금지(응답이 공유 캐시에 저장된다). */
  userId: string | null;
  /** 리프레시 쿠키 — auth.refresh(회전)와 logout(폐기)용 */
  refreshToken: string | null;
  /** userId의 전체 프로필을 지연 조회한다(user.me만 호출 — 핫패스는 안 탐) */
  loadUser: () => Promise<User | null>;
  setAuthCookies: (tokens: TokenPair) => void;
  clearAuthCookies: () => void;
};

export interface TrpcContextDeps {
  config: BffConfig;
  accessTokens: AccessTokenService;
  users: UserStore;
}

export function createContextFactory({ config, accessTokens, users }: TrpcContextDeps) {
  return async (opts: FetchCreateContextFnOptions, c: HonoContext): Promise<TrpcContext> => {
    // 인증 핫패스 — 매 요청 서명 검증만. 저장소를 타지 않는다.
    const accessToken = extractAccessToken({ c, cookieName: config.accessCookieName });
    const userId = accessToken ? await accessTokens.verify(accessToken) : null;

    return {
      userId,
      refreshToken: getCookie(c, config.refreshCookieName) ?? null,
      loadUser: () => (userId ? users.findById(userId) : Promise.resolve(null)),
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
