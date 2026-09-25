import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import * as v from 'valibot';
import { subscribeTaskEvents } from '@/app/task-events';
import { createTrpc } from '@/app/trpc.ts';
import { authHydrationSchema, createAuthServerCache } from '@/entities/auth/server-cache';
import { createTaskCacheSession } from '@/entities/task/cache-session';
import { taskHydrationSchema } from '@/entities/task/server-cache';
import { routeTree } from '@/routeTree.gen.ts';
import { hasTrpcErrorCode, TRPC_ERROR_CODES } from '@/shared/form';
import { useT } from '@/shared/i18n';

function NotFound() {
  const t = useT();
  return (
    <div>
      <h1>{t.notFound.code}</h1>
      <p>{t.notFound.message}</p>
    </div>
  );
}

export function getRouter() {
  const transport = createTrpc();
  const { rpc } = transport;
  const taskCacheSession = createTaskCacheSession(
    {
      snapshot: (scope, signal) => rpc.task.snapshot.query(scope, { signal }),
      changes: (cursor, signal) => rpc.task.changes.query({ cursor }, { signal }),
      update: (input, signal) => rpc.task.update.mutate(input, { signal }),
      create: (input, signal) => rpc.task.create.mutate(input, { signal }),
      remove: (id, signal) => rpc.task.delete.mutate({ id }, { signal }),
      createProject: (input, signal) => rpc.task.createProject.mutate(input, { signal }),
      subscribe: (listener) =>
        subscribeTaskEvents(listener, () => {
          void endSession().then(() => router.navigate({ to: '/login', replace: true }));
        }),
      summaries: (signal) => rpc.task.projects.query(undefined, { signal }),
    },
    typeof window !== 'undefined',
  );
  const auth = createAuthServerCache({
    getCurrentUser: async (signal) => {
      try {
        return await rpc.auth.getCurrentUser.query(undefined, { signal });
      } catch (error) {
        if (hasTrpcErrorCode(error, TRPC_ERROR_CODES.unauthorized)) return { user: null };
        throw error;
      }
    },
    login: async (input, signal) => (await rpc.auth.login.mutate(input, { signal })).user,
    signup: async (input, signal) => (await rpc.auth.signup.mutate(input, { signal })).user,
    logout: async (signal) => {
      await rpc.auth.logout.mutate(undefined, { signal });
    },
    clearUserData: () => taskCacheSession.clear(),
  });
  async function endSession() {
    await auth.clear();
  }

  const router = createTanStackRouter({
    routeTree,
    context: { taskCacheSession, auth, endSession },
    dehydrate: () => ({ taskData: taskCacheSession.dehydrate(), auth: auth.dehydrate() }),
    hydrate: (state) => {
      const parsed = v.parse(v.object({ taskData: v.nullable(taskHydrationSchema), auth: authHydrationSchema }), state);
      auth.hydrate(parsed.auth);
      if (parsed.taskData) taskCacheSession.hydrate(parsed.taskData);
    },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
  });

  transport.onSessionLost(() => {
    void endSession().then(() => router.navigate({ to: '/login', replace: true }));
  });
  // 요청 중 리다이렉트나 렌더 중단도 서버 컬렉션·타이머를 남기지 않는다.
  router.serverSsrLifecycle = {
    ...router.serverSsrLifecycle,
    onServerSsrAttach: [
      ...(router.serverSsrLifecycle?.onServerSsrAttach ?? []),
      (ssr) =>
        ssr.onCleanup(() => {
          void Promise.all([taskCacheSession.clear(), auth.dispose()]);
        }),
    ],
  };

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
