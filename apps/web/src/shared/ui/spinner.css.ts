import { recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const spinner = recipe({
  base: rec({
    display: 'inline-block',
    flexShrink: 0,
    width: '1em',
    height: '1em',
    borderRadius: vars.radii.full,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'currentcolor',
    borderBottomColor: 'transparent',
    animation: 'toodaySpin 0.6s linear infinite',
  }),
});
