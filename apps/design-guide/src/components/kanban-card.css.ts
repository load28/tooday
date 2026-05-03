import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[3],
  height: '52px',
  padding: `0 ${tokens.space[6]}`,
  background: 'transparent',
  textDecoration: 'none',
  color: 'inherit',
  borderTop: `1px solid ${tokens.color.divider}`,
  selectors: {
    'li:first-of-type > &': { borderTop: 'none' },
    '&:active': { background: tokens.color.surfaceMuted },
  },
});

export const dot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flex: '0 0 auto',
});

export const doneIcon = style({
  color: tokens.color.success,
  flex: '0 0 auto',
});

export const title = style({
  flex: 1,
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.01em',
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const titleDone = style({
  color: tokens.color.textTertiary,
  textDecoration: 'line-through',
  textDecorationColor: tokens.color.borderStrong,
});

export const time = style({
  fontSize: tokens.fontSize.sm,
  color: tokens.color.textTertiary,
  fontWeight: tokens.fontWeight.medium,
  fontFeatureSettings: '"tnum" 1',
  flex: '0 0 auto',
});
