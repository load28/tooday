import { style } from '@vanilla-extract/css';
import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { ON } from '@/styles/conditions';
import { rec } from '@/styles/layers.css';
import { textStyles } from '@/styles/text-styles';
import { vars } from '@/styles/theme.css';

export const stripCls = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: vars.space.xs,
  paddingTop: vars.space.md,
  paddingBottom: vars.space['2xl'],
  paddingInline: vars.space.xl,
});

// 셀 고유 스타일만 — 리셋·포커스 링은 BaseButton이, 선택 룩은 Ark data-state(_on)가 처리한다.
export const cellRecipe = recipe({
  base: rec({
    flexDirection: 'column',
    paddingTop: vars.space.md,
    paddingBottom: vars.space.sm,
    borderRadius: vars.radii.lg,
    transition: `background ${vars.duration.base} ${vars.easing.standard}, color ${vars.duration.base} ${vars.easing.standard}`,
    selectors: { [ON]: { background: vars.color.primary, color: vars.color.onPrimary } },
  }),
  variants: {
    tone: {
      idle: rec({ color: vars.color.textTertiary }),
      today: rec({ color: vars.color.primary }),
    },
  },
});

export const dowCls = style({ ...textStyles.micro, marginBottom: vars.space.xs });
export const dayCls = style({ ...textStyles.numericLg });

export const dotRecipe = recipe({
  base: rec({
    width: vars.size.xs,
    height: vars.size.xs,
    borderRadius: vars.radii.pill,
    marginTop: vars.space.xs,
  }),
  variants: {
    mark: {
      none: rec({ background: 'transparent' }),
      tasks: rec({
        background: vars.color.primary,
        selectors: { '[data-state="on"] &': { background: vars.color.onPrimaryMuted } },
      }),
    },
  },
});

export type CellRecipeVariantProps = NonNullable<RecipeVariants<typeof cellRecipe>>;
export type DotRecipeVariantProps = NonNullable<RecipeVariants<typeof dotRecipe>>;
