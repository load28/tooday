import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import pretendardCss from 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css?url';
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
      // Pretendard는 CDN 대신 pretendard 패키지를 번들해 자체 오리진에서 서빙한다.
      // global.css의 @import로 두면 panda가 생성 규칙을 주입해 @import가
      // 선두 규칙이 아니게 되어 무시되므로 link로 분리해 로드한다.
      {
        rel: 'stylesheet',
        href: pretendardCss,
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
