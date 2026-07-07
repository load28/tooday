import { defineRecipe } from '@pandacss/dev';

// config recipe(빌드 전용) — panda.config.ts가 import해 등록한다. 런타임 컴포넌트는
// styled-system/recipes의 생성된 함수를 쓴다. 왜 cva가 아니라 config recipe인지는
// docs/conventions/ui-styling.md 참고(요지: recipe 레이어가 utilities override에 항상 져서
// 사용처/asChild override가 예측 가능하게 이긴다).
export const pressable = defineRecipe({
  className: 'pressable',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'md',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'text',
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
    tone: {
      ghost: { color: 'text', _press: { bg: 'pressedStrong' } },
      subtle: { bg: 'surfaceMuted', color: 'textSecondary', _press: { bg: 'surfaceSoft' } },
      brand: { bg: 'primary', color: 'onPrimary', _press: { bg: 'primaryPressed' } },
      brandSoft: { bg: 'primarySoft', color: 'primary', _press: { bg: 'primarySofter' } },
      danger: { bg: 'danger', color: 'textInverse', _press: { bg: 'dangerPressed' } },
      dangerSoft: { bg: 'dangerSoft', color: 'danger', _press: { bg: 'dangerSoft', filter: 'brightness(0.96)' } },
    },
    shape: {
      square: { borderRadius: 'md' },
      rounded: { borderRadius: 'lg' },
      pill: { borderRadius: 'pill' },
      circle: { borderRadius: 'full', aspectRatio: '1 / 1' },
    },
    size: {
      sm: { height: 'controlSm', paddingX: 'xl', textStyle: 'bodySm' },
      md: { height: 'tap', paddingX: '2xl', textStyle: 'body' },
      lg: { height: 'tapLg', paddingX: '3xl', textStyle: 'bodyLg' },
      xl: { height: 'tapXl', paddingX: '3xl', textStyle: 'bodyLgStrong' },
      icon: { height: 'tap', width: 'tap', paddingX: '0' },
      iconLg: { height: 'tapLg', width: 'tapLg', paddingX: '0' },
    },
    pressed: { true: { transform: 'scale(0.96)' } },
  },
  defaultVariants: { tone: 'ghost', shape: 'rounded', size: 'md' },
});
