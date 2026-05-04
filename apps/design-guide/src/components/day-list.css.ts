import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const dayList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[5],
  padding: `${tokens.space[2]} ${tokens.space[4]} ${tokens.space[7]}`,
});

export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[2],
});

export const sectionHeader = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textTertiary,
  letterSpacing: '-0.01em',
  paddingLeft: tokens.space[2],
});

export const list = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const row = style({
  display: 'flex',
  alignItems: 'stretch',
  height: '56px',
  borderTop: `1px solid ${tokens.color.divider}`,
  selectors: {
    '&:first-of-type': { borderTop: 'none' },
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
  textDecoration: 'none',
  color: 'inherit',
  minWidth: 0,
});

export const time = style({
  width: '46px',
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textTertiary,
  fontFeatureSettings: '"tnum" 1',
  flex: '0 0 auto',
});

export const title = style({
  flex: 1,
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.01em',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const titleDone = style({
  color: tokens.color.textTertiary,
  textDecoration: 'line-through',
  textDecorationColor: tokens.color.borderStrong,
});

export const empty = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: tokens.space[2],
  padding: `${tokens.space[10]} ${tokens.space[6]}`,
  textAlign: 'center',
});

export const emptyIcon = style({
  color: tokens.color.borderStrong,
  marginBottom: tokens.space[2],
});

export const emptyText = style({
  margin: 0,
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textSecondary,
});

export const emptyHint = style({
  margin: 0,
  fontSize: tokens.fontSize.sm,
  color: tokens.color.textTertiary,
});
