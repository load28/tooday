import { defineRecipe } from '@pandacss/dev';

// config recipe(빌드 전용). 근거: docs/conventions/ui-styling.md.
export const fieldRoot = defineRecipe({
  className: 'fieldRoot',
  base: { display: 'flex', flexDirection: 'column', gap: 'md', minWidth: 0 },
});
