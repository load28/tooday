import { defineRecipe } from '@pandacss/dev';

export const fieldRoot = defineRecipe({
  className: 'fieldRoot',
  base: { display: 'flex', flexDirection: 'column', gap: 'md', minWidth: 0 },
});
