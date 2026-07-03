import type { SessionStore, UserStore } from '@bff/auth/ports';
import { router } from '@bff/trpc/init';
import { createAuthRouter } from '@bff/trpc/routers/auth';
import { pubRouter } from '@bff/trpc/routers/pub';
import { userRouter } from '@bff/trpc/routers/user';

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
