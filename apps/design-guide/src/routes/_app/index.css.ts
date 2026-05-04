import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const dateNav = style({
  display: 'grid',
  gridTemplateColumns: '40px 1fr 40px',
  alignItems: 'center',
  padding: `${tokens.space[3]} ${tokens.space[4]} ${tokens.space[4]}`,
  gap: tokens.space[2],
});

export const dateNavBtn = style({
  width: '40px',
  height: '40px',
  border: 'none',
  background: 'transparent',
  borderRadius: tokens.radius.md,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: tokens.color.textSecondary,
  selectors: {
    '&:active': { background: tokens.color.surfaceMuted },
    '&:disabled': { color: tokens.color.borderStrong, cursor: 'default' },
  },
});

export const dateNavTitle = style({
  fontSize: tokens.fontSize['3xl'],
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.025em',
  margin: 0,
  padding: 0,
  border: 'none',
  background: 'transparent',
  fontFamily: 'inherit',
  textAlign: 'center',
  fontFeatureSettings: '"tnum" 1',
  cursor: 'pointer',
  selectors: {
    '&:active': { color: tokens.color.textSecondary },
  },
});
