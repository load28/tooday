import { recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const fieldRoot = recipe({
  base: rec({ display: 'flex', flexDirection: 'column', gap: vars.space.md, minWidth: 0 }),
});
