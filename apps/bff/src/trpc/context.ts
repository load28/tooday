import type { User } from '@tooday/shared';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Context as HonoContext } from 'hono';
import { serializeSessionCookie, serializeSessionCookieRemoval } from '../auth/session-cookie';
import type { SessionStore } from '../auth/session-store';
import { extractSessionToken } from '../auth/token';
import type { UserStore } from '../auth/user-store';
import type { BffConfig } from '../config';

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
  return (opts: FetchCreateContextFnOptions, c: HonoContext): TrpcContext => {
    const sessionToken = extractSessionToken({ c, cookieName: config.cookieName });
    const session = sessionToken ? sessions.get(sessionToken) : null;
    const user = session ? users.findById(session.userId) : null;

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
