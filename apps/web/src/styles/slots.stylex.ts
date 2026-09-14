import * as stylex from '@stylexjs/stylex';

// 조상 → 자손으로 상태를 전달하는 변수. StyleX는 자손 셀렉터를 지원하지 않으므로
// 공식 레시피(Variables for descendant styles)대로 조상이 변수 값을 바꾸고 자손이 읽는다.
export const swatch = stylex.defineVars({
  color: 'transparent',
  indicatorOpacity: '0',
});

export const weekCell = stylex.defineVars({
  dotColor: 'transparent',
});
