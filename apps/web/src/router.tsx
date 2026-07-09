import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { createTrpc } from '@/app/trpc.ts';
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
