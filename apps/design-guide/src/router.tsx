import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

function NotFound() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>404</h1>
      <p>페이지를 찾을 수 없습니다.</p>
    </div>
  );
}

const basepath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    basepath,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
