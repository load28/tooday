import type { SessionStore, UserStore } from '@bff/modules/auth/ports';
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
  users: UserStore;
}

export function createContextFactory({ config, sessions, users }: TrpcContextDeps) {
  return async (opts: FetchCreateContextFnOptions, c: HonoContext): Promise<TrpcContext> => {
    const sessionToken = extractSessionToken({ c, cookieName: config.cookieName });
    const session = sessionToken ? await sessions.get(sessionToken) : null;
    const user = session ? await users.findById(session.userId) : null;

    return {
      user,
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
