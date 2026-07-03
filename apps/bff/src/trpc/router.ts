import type { SessionStore, UserStore } from '@bff/modules/auth/ports';
import { createAuthRouter } from '@bff/modules/auth/router';
import { pubRouter } from '@bff/modules/pub/router';
import { userRouter } from '@bff/modules/user/router';
import { router } from '@bff/trpc/init';

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
