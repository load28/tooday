import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import * as v from 'valibot';
import { subscribeTaskEvents } from '@/app/task-events';
import { createTrpc } from '@/app/trpc.ts';
import { taskHydrationSchema } from '@/entities/task/data';
import { createTaskSession } from '@/entities/task/session';
import { routeTree } from '@/routeTree.gen.ts';
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
  const { queryClient, trpc, rpc } = transport;
  const taskSession = createTaskSession(
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
      invalidateSummaries: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.task.projects.queryKey() });
      },
    },
    typeof window !== 'undefined',
  );
  async function endSession() {
    const cleanup = taskSession.clear();
    queryClient.clear();
    await cleanup;
  }

  const router = createTanStackRouter({
    routeTree,
    context: { ...transport, taskSession, endSession },
    dehydrate: () => ({ taskData: taskSession.dehydrate() }),
    hydrate: (state) => {
      const parsed = v.parse(v.object({ taskData: v.nullable(taskHydrationSchema) }), state);
      if (parsed.taskData) taskSession.hydrate(parsed.taskData);
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
          void taskSession.clear();
        }),
    ],
  };
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
