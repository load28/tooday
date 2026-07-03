import type { SessionStore, UserStore } from '../auth/ports';
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
    pub: pubRouter,
    auth: createAuthRouter(deps),
    user: userRouter,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
