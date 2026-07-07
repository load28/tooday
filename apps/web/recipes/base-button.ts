import { defineRecipe } from '@pandacss/dev';

// 베이스 버튼 — 클릭 가능한 엘리먼트의 리셋 + 인터랙션 계약만 갖는다.
// (네이티브 버튼 스타일 제거, 프레스 피드백, 포커스 링, disabled)
// 색·크기·모양(tone/shape/size)은 여기 두지 않는다 — 버튼 룩은 Button의
// utilities 오버레이가, 그 외 파생(스와치·탭 등)은 각자의 오버레이가 얹는다.
// config recipe(@layer recipes)로 두는 이유: 파생의 utilities 오버레이가
// 항상 결정적으로 이기게 하기 위해서다 (docs/conventions/ui-styling.md).
export const baseButton = defineRecipe({
  className: 'baseButton',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    appearance: 'none',
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'inherit',
    fontFamily: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'left',
    minWidth: 0,
    transition:
      'background-color {durations.fast} {easings.exit}, transform {durations.fast} {easings.exit}, color {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
    // _disabled는 aria-disabled까지 매칭하므로 네이티브 disabled에만 한정한다
    '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
    _focusVisible: { outline: 'none', boxShadow: 'focus' },
  },
  variants: {
    pressed: { true: { transform: 'scale(0.96)' } },
  },
});
