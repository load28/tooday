import type { AccessTokenService } from '@bff/modules/auth/access-token';
import type { RefreshTokenStore, UserStore } from '@bff/modules/auth/ports';
import { createAuthRouter } from '@bff/modules/auth/router';
import { pubRouter } from '@bff/modules/pub/router';
import type { ProjectStore, TaskStore } from '@bff/modules/task/ports';
import { createTaskRouter } from '@bff/modules/task/router';
import { userRouter } from '@bff/modules/user/router';
import type { SyncBroker } from '@bff/platform/sync-broker';
import { router } from '@bff/trpc/init';

export interface AppRouterDeps {
  users: UserStore;
  refreshTokens: RefreshTokenStore;
  accessTokens: AccessTokenService;
  tasks: TaskStore;
  projects: ProjectStore;
  sync: SyncBroker;
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
