import { defineRecipe } from '@pandacss/dev';

// config recipe(빌드 전용). 근거: docs/conventions/ui-styling.md.
export const sectionHeader = defineRecipe({
  className: 'sectionHeader',
  base: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 'xl',
    paddingX: '3xl',
    paddingY: 'md',
  },
});

export const sectionHeaderTrailing = defineRecipe({
  className: 'sectionHeaderTrailing',
  base: { display: 'flex', alignItems: 'center', gap: 'md' },
});
