import { style } from '@vanilla-extract/css';
import { util } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const formCls = style(
  util({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '420px',
    minHeight: '100%',
    marginInline: 'auto',
    paddingInline: vars.space.pageX,
    paddingTop: 'clamp(48px, 16dvh, 140px)',
    paddingBottom: vars.space['4xl'],
    gap: vars.space['4xl'],
  }),
);
