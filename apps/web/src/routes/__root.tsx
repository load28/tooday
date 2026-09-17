import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { createIsomorphicFn } from '@tanstack/react-start';
import pretendardCss from 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css?url';
import type { ReactNode } from 'react';
import globalCss from '@/app/global.css?url';
import { StylexStyleSheet } from '@/app/stylex-stylesheet';
import { AuthDataProvider } from '@/entities/auth/context';
import type { RouterAppContext } from '@/router-context';
import { getDictionary, I18nProvider, type Locale, resolveLocale } from '@/shared/i18n';

// locale은 요청 스코프로 결정한다. 사전은 함수형 문구를 포함하므로 loader 데이터로 직렬화하지 않는다.
const resolveRequestLocale = createIsomorphicFn()
  .client((): Locale => resolveLocale(navigator.language))
  .server(async (): Promise<Locale> => {
    const { getRequestHeader } = await import('@tanstack/react-start/server');
    return resolveLocale(getRequestHeader('Accept-Language'));
  });

export const Route = createRootRouteWithContext<RouterAppContext>()({
  loader: async () => {
    const locale = await resolveRequestLocale();
    return { locale };
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
  const { locale } = Route.useLoaderData();
  const { auth } = Route.useRouteContext();
  const dictionary = getDictionary(locale);
  return (
    <I18nProvider value={{ locale, dictionary }}>
      <AuthDataProvider data={auth}>
        <Outlet />
      </AuthDataProvider>
    </I18nProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 캐스케이드 레이어 순서 확정 — reset < base < stylex.
            stylex는 StyleX가 방출하는 stylex.priorityN의 부모 레이어다. 스타일시트 주입 순서와
            무관하게 컴포넌트 스타일이 리셋을 이기도록 이 한 줄이 자리를 확정한다.
            (컴포넌트끼리의 승패는 레이어가 아니라 stylex.props 인자 순서가 정한다) */}
        <style>{'@layer reset, base, stylex;'}</style>
        <StylexStyleSheet />
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
