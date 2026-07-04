import type { SessionStore } from '@bff/modules/auth/ports';
import { serializeSessionCookie, serializeSessionCookieRemoval } from '@bff/modules/auth/session-cookie';
import { extractSessionToken } from '@bff/modules/auth/token';
import type { BffConfig } from '@bff/platform/config';
import type { User } from '@tooday/shared';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Context as HonoContext } from 'hono';

export type TrpcContext = {
  /** pub.* 프로시저는 user를 참조하면 안 된다 — 응답이 공유 캐시에 저장된다 */
  user: User | null;
  sessionToken: string | null;
  setSessionCookie: (token: string) => void;
  clearSessionCookie: () => void;
};

export interface TrpcContextDeps {
  config: BffConfig;
  sessions: SessionStore;
}

export function createContextFactory({ config, sessions }: TrpcContextDeps) {
  return async (opts: FetchCreateContextFnOptions, c: HonoContext): Promise<TrpcContext> => {
    const sessionToken = extractSessionToken({ c, cookieName: config.cookieName });
    // 인증 핫패스는 요청마다 타므로 세션+유저를 단일 조회로 가져온다
    const auth = sessionToken ? await sessions.getWithUser(sessionToken) : null;

    return {
      user: auth?.user ?? null,
      sessionToken,
      setSessionCookie: (token) => {
        opts.resHeaders.append('set-cookie', serializeSessionCookie({ config, token }));
      },
      clearSessionCookie: () => {
        opts.resHeaders.append('set-cookie', serializeSessionCookieRemoval(config));
      },
    };
  };
}
