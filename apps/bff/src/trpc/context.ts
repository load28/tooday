import type { User } from '@tooday/shared';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Context as HonoContext } from 'hono';
import { serialize } from 'hono/utils/cookie';
import type { SessionStore } from '../auth/session-store';
import { extractSessionToken } from '../auth/token';
import type { UserStore } from '../auth/user-store';
import type { BffConfig } from '../config';

export type TrpcContext = {
  /**
   * 쿠키 또는 Bearer 헤더로 식별된 유저 (없으면 null).
   * 주의: pub.* 프로시저는 절대 user를 참조하면 안 된다.
   * pub.* 응답은 공유 캐시(CDN)에 저장되므로 유저별로 달라지면 캐시 오염이 발생한다.
   */
  user: User | null;
  sessionToken: string | null;
  /** 세션 토큰을 httpOnly 쿠키로 응답에 심는다 (웹 클라이언트용) */
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
    const sessionToken = extractSessionToken(c, config.cookieName);
    const session = sessionToken ? sessions.get(sessionToken) : null;
    const user = session ? users.findById(session.userId) : null;

    return {
      user,
      sessionToken,
      setSessionCookie: (token) => {
        opts.resHeaders.append(
          'set-cookie',
          serialize(config.cookieName, token, {
            httpOnly: true,
            secure: config.cookieSecure,
            sameSite: 'Lax',
            path: '/',
            maxAge: Math.floor(config.sessionTtlMs / 1000),
          }),
        );
      },
      clearSessionCookie: () => {
        opts.resHeaders.append('set-cookie', serialize(config.cookieName, '', { path: '/', maxAge: 0 }));
      },
    };
  };
}
