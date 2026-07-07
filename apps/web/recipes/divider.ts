import { defineRecipe } from '@pandacss/dev';

export const divider = defineRecipe({
  className: 'divider',
  base: { border: 'none', background: 'divider', flexShrink: 0 },
  variants: {
    orientation: {
      horizontal: { width: '100%', height: '1px' },
      vertical: { height: 'auto', alignSelf: 'stretch', width: '1px' },
    },
    tone: {
      subtle: { background: 'divider' },
      strong: { background: 'border' },
    },
    inset: {
      none: { marginInline: '0' },
      content: { marginInline: 'pageX' },
      leading: { marginInlineStart: 'dividerLeadingInset' },
    },
  },
  defaultVariants: { orientation: 'horizontal', tone: 'subtle', inset: 'none' },
});
