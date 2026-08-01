import { style } from '@vanilla-extract/css';
import { util } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const pageCls = style(
  util({
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space['2xl'],
    paddingInline: vars.space.pageX,
    paddingTop: vars.space.lg,
    paddingBottom: vars.space['4xl'],
  }),
);
