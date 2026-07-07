import { defineRecipe } from '@pandacss/dev';

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
