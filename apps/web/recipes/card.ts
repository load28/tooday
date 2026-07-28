import { defineRecipe } from '@pandacss/dev';

export const card = defineRecipe({
  className: 'card',
  base: {
    bg: 'surface',
    borderRadius: 'xl',
    overflow: 'hidden',
    minWidth: 0,
    color: 'text',
    transition: 'box-shadow {durations.fast} {easings.exit}',
  },
  variants: {
    elevation: {
      flat: { boxShadow: 'none', border: '1px solid {colors.border}' },
      raised: { boxShadow: 'card' },
      floating: { boxShadow: 'lg' },
    },
    radius: {
      md: { borderRadius: 'md' },
      lg: { borderRadius: 'lg' },
      xl: { borderRadius: 'xl' },
      '2xl': { borderRadius: '2xl' },
    },
    padding: {
      none: { padding: '0' },
      sm: { padding: 'cardPadSm' },
      md: { padding: 'cardPadMd' },
      lg: { padding: 'cardPadLg' },
    },
    interactive: {
      true: {
        position: 'relative',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        _focusVisible: { outline: 'none', boxShadow: 'focus' },
        // press 피드백은 크기에 비례하는 scale 대신 크기 무관 state layer(불투명도 오버레이)로 준다.
        // 카드는 불투명 bg라 오버레이를 ::before로 얹는다. base의 overflow:hidden이 라운드로 클리핑.
        _before: {
          content: '""',
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          backgroundColor: 'transparent',
          transition: 'background-color {durations.fast} {easings.exit}',
        },
        _hover: { _before: { backgroundColor: 'stateHover' } },
        _press: { _before: { backgroundColor: 'statePressed' } },
      },
    },
    selected: {
      true: { boxShadow: '0 0 0 2px {colors.primary}, {shadows.card}' },
    },
  },
  defaultVariants: { elevation: 'raised', radius: 'xl', padding: 'none' },
});
