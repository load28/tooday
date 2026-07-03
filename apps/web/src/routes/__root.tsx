import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { ReactNode } from 'react';
import globalCss from '@/app/global.css?url';
import type { RouterAppContext } from '@/app/trpc.ts';

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
      },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'format-detection', content: 'telephone=no, email=no, address=no' },
      {
        title: 'TooDay',
      },
    ],
    links: [
      // Pretendard는 CSS @import 대신 link로 로드한다 — panda가 생성 규칙을
      // global.css에 주입하면 @import가 선두 규칙이 아니게 되어 무시된다.
      { rel: 'preconnect', href: 'https://cdn.jsdelivr.net', crossOrigin: '' },
      {
        rel: 'stylesheet',
        crossOrigin: '',
        href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
      },
      {
        rel: 'stylesheet',
        href: globalCss,
      },
    ],
  }),
  shellComponent: RootDocument,
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
          config={{
            position: 'bottom-right',
          }}
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
