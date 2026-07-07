import { defineRecipe } from '@pandacss/dev';

// config recipe(빌드 전용). 근거: docs/conventions/ui-styling.md.
export const dot = defineRecipe({
  className: 'dot',
  base: { display: 'inline-block', flexShrink: 0, borderRadius: 'full' },
  variants: {
    size: {
      xs: { width: 'xs', height: 'xs' },
      sm: { width: 'sm', height: 'sm' },
      md: { width: 'md', height: 'md' },
      lg: { width: 'lg', height: 'lg' },
    },
    tone: {
      primary: { bg: 'primary' },
      success: { bg: 'success' },
      warning: { bg: 'warning' },
      danger: { bg: 'danger' },
      neutral: { bg: 'borderStrong' },
      muted: { bg: 'border' },
    },
  },
  defaultVariants: { size: 'sm', tone: 'neutral' },
});
