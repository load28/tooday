import { useEffect } from 'react';

// StyleX는 프로덕션 빌드에서만 CSS 자산에 결과를 덧붙인다. dev 서버에서는 플러그인이
// 노출하는 가상 모듈(/virtual:stylex.css)을 직접 물어야 스타일이 나오고,
// virtual:stylex:css-only 동적 임포트가 HMR로 갱신된 CSS를 다시 받아온다.
export function StylexDevStyles() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      import('virtual:stylex:css-only');
    }
  }, []);

  if (!import.meta.env.DEV) return null;
  return <link rel="stylesheet" href="/virtual:stylex.css" />;
}
