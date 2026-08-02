import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { BEFORE, FOCUS_VISIBLE } from '@/styles/conditions';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const card = recipe({
  base: rec({
    background: vars.color.surface,
    borderRadius: vars.radii.xl,
    overflow: 'hidden',
    minWidth: 0,
    color: vars.color.text,
    transition: `box-shadow ${vars.duration.fast} ${vars.easing.exit}`,
  }),
  variants: {
    elevation: {
      flat: rec({ boxShadow: 'none', border: `1px solid ${vars.color.border}` }),
      raised: rec({ boxShadow: vars.shadow.card }),
      floating: rec({ boxShadow: vars.shadow.lg }),
    },
    radius: {
      md: rec({ borderRadius: vars.radii.md }),
      lg: rec({ borderRadius: vars.radii.lg }),
      xl: rec({ borderRadius: vars.radii.xl }),
      '2xl': rec({ borderRadius: vars.radii['2xl'] }),
    },
    padding: {
      none: rec({ padding: '0' }),
      sm: rec({ padding: vars.space.cardPadSm }),
      md: rec({ padding: vars.space.cardPadMd }),
      lg: rec({ padding: vars.space.cardPadLg }),
    },
    interactive: {
      true: rec({
        position: 'relative',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        selectors: {
          [FOCUS_VISIBLE]: { outline: 'none', boxShadow: vars.shadow.focus },
          // press 딤 — 크기 무관 state layer 오버레이(::before). --press-dim을 Framer Motion whileTap이 구동한다.
          [BEFORE]: {
            content: '""',
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
            backgroundColor: vars.color.statePressed,
            opacity: 'var(--press-dim, 0)',
          },
        },
      }),
    },
    selected: {
      true: rec({ boxShadow: `0 0 0 2px ${vars.color.primary}, ${vars.shadow.card}` }),
    },
  },
  defaultVariants: { elevation: 'raised', radius: 'xl', padding: 'none' },
});

export type CardVariantProps = NonNullable<RecipeVariants<typeof card>>;
