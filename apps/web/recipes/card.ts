import { defineRecipe } from '@pandacss/dev';

export const card = defineRecipe({
  className: 'card',
  base: {
    bg: 'surface',
    borderRadius: 'xl',
    overflow: 'hidden',
    minWidth: 0,
    color: 'text',
    transition: 'box-shadow {durations.fast} {easings.exit}, transform {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
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
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        _press: { transform: 'scale(0.99)' },
      },
    },
    selected: {
      true: { boxShadow: '0 0 0 2px {colors.primary}, {shadows.card}' },
    },
  },
  defaultVariants: { elevation: 'raised', radius: 'xl', padding: 'none' },
});
