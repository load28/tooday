import { style, styleVariants } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const sectionTitle = style({
  fontSize: tokens.fontSize['2xl'],
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.02em',
  margin: 0,
});

export const sectionSubtitle = style({
  fontSize: tokens.fontSize.md,
  color: tokens.color.textTertiary,
  margin: 0,
  marginTop: tokens.space[1],
});

export const card = style({
  background: tokens.color.surface,
  borderRadius: tokens.radius.lg,
  border: `1px solid ${tokens.color.border}`,
  boxShadow: tokens.shadow.sm,
});

export const pill = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '24px',
  padding: `0 ${tokens.space[2]}`,
  borderRadius: tokens.radius.pill,
  background: tokens.color.surfaceMuted,
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.medium,
  color: tokens.color.textSecondary,
});

export const colorDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flex: '0 0 auto',
});

export const statusDot = style({
  width: '8px',
  height: '8px',
  borderRadius: tokens.radius.sm,
});

export const statusBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: `4px ${tokens.space[2]}`,
  borderRadius: tokens.radius.pill,
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
});

export const statusBadgeVariants = styleVariants({
  todo: {
    background: tokens.color.surfaceMuted,
    color: tokens.color.textSecondary,
  },
  doing: {
    background: tokens.color.primarySoft,
    color: tokens.color.primary,
  },
  done: {
    background: '#e8f8f4',
    color: tokens.color.success,
  },
});

export const button = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: tokens.space[2],
  height: '52px',
  padding: `0 ${tokens.space[5]}`,
  borderRadius: tokens.radius.lg,
  border: 'none',
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.semibold,
  letterSpacing: '-0.01em',
});

export const buttonVariants = styleVariants({
  primary: {
    background: tokens.color.primary,
    color: tokens.color.textInverse,
    selectors: {
      '&:active': { background: tokens.color.primaryHover },
    },
  },
  secondary: {
    background: tokens.color.surfaceMuted,
    color: tokens.color.textPrimary,
    selectors: {
      '&:active': { background: tokens.color.divider },
    },
  },
  ghost: {
    background: 'transparent',
    color: tokens.color.textSecondary,
  },
});
