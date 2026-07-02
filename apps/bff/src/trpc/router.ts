import type { SessionStore } from '../auth/session-store';
import type { UserStore } from '../auth/user-store';
import { router } from './init';
import { createAuthRouter } from './routers/auth';
import { pubRouter } from './routers/pub';
import { userRouter } from './routers/user';

export interface AppRouterDeps {
  users: UserStore;
  sessions: SessionStore;
}

export function createAppRouter(deps: AppRouterDeps) {
  return router({
    /** HTTP 캐시 대상 (public Cache-Control). 유저 의존 데이터 금지 */
    pub: pubRouter,
    /** 프라이빗: 인증 */
    auth: createAuthRouter(deps),
    /** 프라이빗: 유저 데이터 */
    user: userRouter,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
