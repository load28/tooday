import { defineRecipe } from '@pandacss/dev';

// 베이스 버튼 — 리셋 + 인터랙션 계약(프레스·포커스 링·disabled)만. 색·크기·모양은
// 파생(Button의 tone/shape/size, 스와치·탭 등)이 utilities 층 오버레이로 얹는다.
// config recipe(@layer recipes)인 이유: 오버레이가 항상 결정적으로 이기게 (docs/conventions/ui-styling.md).
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
    // 색만 CSS로 트랜지션. press 축소(transform)는 Button이 Framer Motion 스프링으로 애니메이션한다.
    transition: 'background-color {durations.fast} {easings.exit}, color {durations.fast} {easings.exit}',
    // _disabled는 aria-disabled까지 매칭하므로 네이티브 disabled에만 한정한다
    '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
    _focusVisible: { outline: 'none', boxShadow: 'focus' },
  },
});
