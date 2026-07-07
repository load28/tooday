import { defineRecipe } from '@pandacss/dev';

export const chip = defineRecipe({
  className: 'chip',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'sm',
    paddingInline: 'md',
    paddingBlock: '2xs',
    borderRadius: 'pill',
    textStyle: 'caption',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  variants: {
    tone: {
      neutral: { bg: 'surfaceSoft', color: 'textSecondary' },
      brand: { bg: 'primarySoft', color: 'primary' },
      success: { bg: 'successSoft', color: 'success' },
      warning: { bg: 'warningSoft', color: 'warning' },
      danger: { bg: 'dangerSoft', color: 'danger' },
      outline: { bg: 'transparent', color: 'textSecondary', border: '1px solid {colors.border}' },
    },
    size: {
      sm: { textStyle: 'micro', paddingBlock: '0' },
      md: { textStyle: 'caption' },
      lg: { textStyle: 'bodySm', paddingBlock: 'xs', paddingInline: 'xl' },
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});
