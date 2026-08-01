import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const tDivider = recipe({
  base: rec({ border: 'none', background: vars.color.divider, flexShrink: 0 }),
  variants: {
    orientation: {
      horizontal: rec({ width: '100%', height: '1px' }),
      vertical: rec({ height: 'auto', alignSelf: 'stretch', width: '1px' }),
    },
    tone: {
      subtle: rec({ background: vars.color.divider }),
      strong: rec({ background: vars.color.border }),
    },
    inset: {
      none: rec({ marginInline: '0' }),
      content: rec({ marginInline: vars.space.pageX }),
      leading: rec({ marginInlineStart: vars.space.dividerLeadingInset }),
    },
  },
  defaultVariants: { orientation: 'horizontal', tone: 'subtle', inset: 'none' },
});

export type TDividerVariantProps = NonNullable<RecipeVariants<typeof tDivider>>;
