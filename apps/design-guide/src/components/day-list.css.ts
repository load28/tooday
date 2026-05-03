import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const dayList = style({
  display: 'flex',
  flexDirection: 'column',
  paddingBottom: tokens.space[7],
});

export const section = style({
  display: 'flex',
  flexDirection: 'column',
  selectors: {
    '&:not(:first-of-type)': { marginTop: tokens.space[5] },
  },
});

export const sectionHeader = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textTertiary,
  letterSpacing: '-0.01em',
  padding: `${tokens.space[2]} ${tokens.space[6]}`,
});

export const list = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
});

export const row = style({
  display: 'flex',
  alignItems: 'center',
  height: '52px',
  padding: `0 ${tokens.space[3]} 0 ${tokens.space[6]}`,
  gap: tokens.space[3],
  background: 'transparent',
  position: 'relative',
  willChange: 'transform',
  borderTop: `1px solid ${tokens.color.divider}`,
  selectors: {
    '&:first-of-type': { borderTop: 'none' },
  },
});

export const rowDragging = style({
  background: tokens.color.surface,
  borderRadius: tokens.radius.md,
  borderTop: 'none !important',
  boxShadow: tokens.shadow.lg,
});

export const body = style({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[3],
  textDecoration: 'none',
  color: 'inherit',
  height: '100%',
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

export const dot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
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

export const handle = style({
  width: '28px',
  height: '28px',
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: tokens.color.borderStrong,
  borderRadius: tokens.radius.sm,
  flex: '0 0 auto',
  cursor: 'grab',
  touchAction: 'none',
  selectors: {
    '&:active': { cursor: 'grabbing', color: tokens.color.textTertiary },
  },
});

export const empty = style({
  padding: `${tokens.space[8]} ${tokens.space[6]}`,
  textAlign: 'center',
  fontSize: tokens.fontSize.md,
  color: tokens.color.textPlaceholder,
});
