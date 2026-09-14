import { useEffect } from 'react';

/**
 * StyleX가 방출한 CSS를 문서에 붙인다. 붙이는 방법이 빌드 모드마다 다르다.
 *
 * - 프로덕션: 플러그인이 빌드 산출 CSS 자산(global.css)에 결과를 덧붙이므로 여기서 할 일이 없다.
 * - 개발: 그 자산이 없다. 플러그인이 노출하는 가상 모듈을 직접 물어야 하고
 *   (`/virtual:stylex.css`), `virtual:stylex:css-only` 동적 임포트가 HMR로 갱신된 CSS를 다시 받아온다.
 *   (기본 devMode 'full'은 transformIndexHtml로 주입하는데 TanStack Start는 index.html이 없다 —
 *   그래서 vite.config.ts가 devMode를 'css-only'로 두고 주입은 여기서 한다.)
 */
export function StylexStyleSheet() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      import('virtual:stylex:css-only');
    }
  }, []);

  if (!import.meta.env.DEV) return null;
  return <link rel="stylesheet" href="/virtual:stylex.css" />;
}
