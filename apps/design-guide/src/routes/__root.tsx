import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import pretendardCss from 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css?url';
import type { ReactNode } from 'react';
import globalCss from '../global.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#3182f6' },
      { title: 'TooDay · Design Guide' },
    ],
    links: [
      // Pretendard는 CDN 대신 pretendard 패키지를 번들해 자체 오리진에서 서빙한다
      { rel: 'stylesheet', href: pretendardCss },
      { rel: 'stylesheet', href: globalCss },
    ],
  }),
  shellComponent: RootDocument,
  component: () => <Outlet />,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
