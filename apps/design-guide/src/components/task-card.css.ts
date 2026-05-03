import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const root = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'stretch',
  background: tokens.color.surface,
  borderRadius: tokens.radius.lg,
  border: `1px solid ${tokens.color.border}`,
  padding: tokens.space[4],
  gap: tokens.space[3],
  textDecoration: 'none',
  color: 'inherit',
  boxShadow: tokens.shadow.sm,
  selectors: {
    '&:active': { transform: 'scale(0.995)' },
  },
});

export const accent = style({
  width: '4px',
  borderRadius: '2px',
  flex: '0 0 auto',
  alignSelf: 'stretch',
});

export const body = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[2],
  minWidth: 0,
});

export const headerRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: tokens.space[3],
});

export const title = style({
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textPrimary,
  margin: 0,
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

export const metaRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[2],
  fontSize: tokens.fontSize.sm,
  color: tokens.color.textTertiary,
  fontWeight: tokens.fontWeight.medium,
});

export const projectChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.medium,
  color: tokens.color.textSecondary,
});

export const dot = style({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
});

export const sep = style({
  width: '2px',
  height: '2px',
  borderRadius: '50%',
  background: tokens.color.borderStrong,
});

export const note = style({
  fontSize: tokens.fontSize.sm,
  color: tokens.color.textTertiary,
  lineHeight: tokens.lineHeight.base,
  margin: 0,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});
