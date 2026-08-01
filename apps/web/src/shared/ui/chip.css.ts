import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { textStyles } from '@/styles/text-styles';
import { vars } from '@/styles/theme.css';

export const chip = recipe({
  base: rec({
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.space.sm,
    paddingInline: vars.space.md,
    paddingBlock: vars.space['2xs'],
    borderRadius: vars.radii.pill,
    ...textStyles.caption,
    whiteSpace: 'nowrap',
    minWidth: 0,
  }),
  variants: {
    tone: {
      neutral: rec({ background: vars.color.surfaceSoft, color: vars.color.textSecondary }),
      brand: rec({ background: vars.color.primarySoft, color: vars.color.primary }),
      success: rec({ background: vars.color.successSoft, color: vars.color.success }),
      warning: rec({ background: vars.color.warningSoft, color: vars.color.warning }),
      danger: rec({ background: vars.color.dangerSoft, color: vars.color.danger }),
      outline: rec({ background: 'transparent', color: vars.color.textSecondary, border: `1px solid ${vars.color.border}` }),
    },
    size: {
      sm: rec({ ...textStyles.micro, paddingBlock: '0' }),
      md: rec({ ...textStyles.caption }),
      lg: rec({ ...textStyles.bodySm, paddingBlock: vars.space.xs, paddingInline: vars.space.xl }),
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});

export type ChipVariantProps = NonNullable<RecipeVariants<typeof chip>>;
