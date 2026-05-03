import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const viewport = style({
  minHeight: '100vh',
  background: tokens.color.bg,
  display: 'flex',
  justifyContent: 'center',
});

export const frame = style({
  width: '100%',
  maxWidth: '480px',
  minHeight: '100vh',
  background: tokens.color.bg,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  borderLeft: `1px solid ${tokens.color.divider}`,
  borderRight: `1px solid ${tokens.color.divider}`,
});

export const topBar = style({
  position: 'sticky',
  top: 0,
  zIndex: tokens.zIndex.sticky,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${tokens.space[3]} ${tokens.space[6]}`,
  background: tokens.color.bg,
  minHeight: '56px',
});

export const topBarTitle = style({
  fontSize: tokens.fontSize.xl,
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.02em',
});

export const topBarLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[2],
});

export const topBarBtn = style({
  width: '40px',
  height: '40px',
  border: 'none',
  background: 'transparent',
  borderRadius: tokens.radius.md,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: tokens.color.textPrimary,
  selectors: {
    '&:hover': { background: tokens.color.surfaceMuted },
    '&:active': { background: tokens.color.divider },
  },
});

export const content = style({
  flex: 1,
  paddingBottom: '88px',
});

export const tabBar = style({
  position: 'fixed',
  left: '50%',
  bottom: 0,
  transform: 'translateX(-50%)',
  width: '100%',
  maxWidth: '480px',
  background: tokens.color.surface,
  borderTop: `1px solid ${tokens.color.divider}`,
  paddingBottom: 'env(safe-area-inset-bottom)',
  zIndex: tokens.zIndex.sticky,
});

export const tabBarInner = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  height: '64px',
});

export const tabItem = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  border: 'none',
  background: 'transparent',
  color: tokens.color.textTertiary,
  fontSize: tokens.fontSize.xs,
  fontWeight: tokens.fontWeight.medium,
  textDecoration: 'none',
});

export const tabItemActive = style({
  color: tokens.color.primary,
  fontWeight: tokens.fontWeight.semibold,
});

export const fab = style({
  position: 'fixed',
  right: 'max(20px, calc(50% - 240px + 20px))',
  bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
  width: '56px',
  height: '56px',
  minWidth: '56px',
  minHeight: '56px',
  borderRadius: '9999px',
  background: tokens.color.primary,
  color: tokens.color.textInverse,
  border: 'none',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: tokens.shadow.lg,
  zIndex: tokens.zIndex.sticky,
  cursor: 'pointer',
  selectors: {
    '&:active': { background: tokens.color.primaryHover },
  },
});
