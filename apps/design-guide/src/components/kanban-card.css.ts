import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const row = style({
  display: 'flex',
  alignItems: 'stretch',
  height: '56px',
  textDecoration: 'none',
  color: 'inherit',
  borderTop: `1px solid ${tokens.color.divider}`,
  selectors: {
    'li:first-of-type > &': { borderTop: 'none' },
    '&:active': { background: tokens.color.surfaceMuted },
  },
});

export const accentLine = style({
  width: '3px',
  margin: `${tokens.space[3]} ${tokens.space[4]} ${tokens.space[3]} 0`,
  borderRadius: tokens.radius.pill,
  flex: '0 0 auto',
});

export const body = style({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[3],
  paddingRight: tokens.space[5],
  minWidth: 0,
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
