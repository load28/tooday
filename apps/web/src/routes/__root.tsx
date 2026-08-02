import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { createIsomorphicFn } from '@tanstack/react-start';
import pretendardCss from 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css?url';
import type { ReactNode } from 'react';
import globalCss from '@/app/global.css?url';
import type { RouterAppContext } from '@/app/trpc.ts';
import { I18nProvider, type Locale, loadDictionary, resolveLocale } from '@/shared/i18n';

// locale은 요청 스코프로 결정한다. loader가 선택된 locale의 사전만 로드해 반환하고,
// SSR 결과가 JSON으로 dehydrate되어 클라이언트도 같은 사전 하나만 갖는다.
const resolveRequestLocale = createIsomorphicFn()
  .client((): Locale => resolveLocale(navigator.language))
  .server(async (): Promise<Locale> => {
    const { getRequestHeader } = await import('@tanstack/react-start/server');
    return resolveLocale(getRequestHeader('Accept-Language'));
  });

export const Route = createRootRouteWithContext<RouterAppContext>()({
  loader: async () => {
    const locale = await resolveRequestLocale();
    return { locale, dictionary: await loadDictionary(locale) };
  },
  component: RootComponent,
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
      // 폰트는 별도 stylesheet link로 로드한다 (global.css는 레이어 선언·리셋 전용).
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

function RootComponent() {
  const { locale, dictionary } = Route.useLoaderData();
  return (
    <I18nProvider value={{ locale, dictionary }}>
      <Outlet />
    </I18nProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 캐스케이드 레이어 순서 확정 — reset < base < recipes < 레이어 없음(오버레이).
            (스타일시트 <link> 주입 순서와 무관하게 recipe가 reset/base를 이기고, 오버레이가 recipe를 이긴다) */}
        <style>{'@layer reset, base, recipes;'}</style>
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
