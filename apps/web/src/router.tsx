import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { routeTree } from '@/routeTree.gen.ts';
import { createTrpc } from '@/trpc.ts';

function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <p>페이지를 찾을 수 없습니다.</p>
    </div>
  );
}

export function getRouter() {
  const { queryClient, trpc } = createTrpc();

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient, trpc },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
