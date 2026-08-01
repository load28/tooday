import { recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const sectionHeader = recipe({
  base: rec({
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: vars.space.xl,
    paddingInline: vars.space['3xl'],
    paddingBlock: vars.space.md,
  }),
});

export const sectionHeaderTrailing = recipe({
  base: rec({ display: 'flex', alignItems: 'center', gap: vars.space.md }),
});
