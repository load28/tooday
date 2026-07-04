import type { SessionStore, UserStore } from '@bff/modules/auth/ports';
import { createAuthRouter } from '@bff/modules/auth/router';
import { pubRouter } from '@bff/modules/pub/router';
import type { ProjectStore, TaskStore } from '@bff/modules/task/ports';
import { createTaskRouter } from '@bff/modules/task/router';
import { userRouter } from '@bff/modules/user/router';
import { router } from '@bff/trpc/init';

export interface AppRouterDeps {
  users: UserStore;
  sessions: SessionStore;
  tasks: TaskStore;
  projects: ProjectStore;
}

export function createAppRouter(deps: AppRouterDeps) {
  return router({
    pub: pubRouter,
    auth: createAuthRouter(deps),
    user: userRouter,
    task: createTaskRouter(deps),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
