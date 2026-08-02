import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { BEFORE, FOCUS_VISIBLE, press } from '@/styles/conditions';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const row = recipe({
  base: rec({
    display: 'flex',
    alignItems: 'center',
    gap: vars.space.xl,
    minWidth: 0,
    width: '100%',
    color: vars.color.text,
    textAlign: 'left',
    transition: `background-color ${vars.duration.fast} ${vars.easing.exit}`,
    selectors: press({ transitionDuration: '0ms' }),
  }),
  variants: {
    density: {
      compact: rec({ paddingInline: vars.space.xl, paddingBlock: vars.space.md, minHeight: vars.size.tap }),
      comfortable: rec({ paddingInline: vars.space['2xl'], paddingBlock: vars.space.xl, minHeight: vars.size.tapLg }),
      spacious: rec({ paddingInline: vars.space['2xl'], paddingBlock: vars.space['2xl'], minHeight: vars.size.tapXl }),
    },
    align: {
      center: rec({ alignItems: 'center' }),
      start: rec({ alignItems: 'flex-start' }),
    },
    interactive: {
      true: rec({
        position: 'relative',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        selectors: {
          // press 딤 — Row 컴포넌트의 whileTap이 --press-dim으로 opacity를 스프링 구동한다(TDS와 동형).
          [BEFORE]: {
            content: '""',
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
            borderRadius: 'inherit',
            backgroundColor: vars.color.statePressed,
            opacity: 'var(--press-dim, 0)',
          },
          [FOCUS_VISIBLE]: { outline: 'none', boxShadow: vars.shadow.focus },
        },
      }),
    },
    inset: {
      none: rec({}),
      flush: rec({ paddingInline: '0' }),
    },
  },
  defaultVariants: { density: 'comfortable', align: 'center', inset: 'none' },
});

export const rowSlotLeading = recipe({
  base: rec({ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
});

export const rowSlotContent = recipe({
  base: rec({
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space['2xs'],
    justifyContent: 'center',
  }),
});

export const rowSlotTrailing = recipe({
  base: rec({ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: vars.space.md, color: vars.color.textTertiary }),
});

export type RowVariantProps = NonNullable<RecipeVariants<typeof row>>;
