import { keyframes, style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const slideUp = keyframes({
  from: { transform: 'translateY(100%)' },
  to: { transform: 'translateY(0)' },
});

export const overlayWrap = style({
  position: 'fixed',
  inset: 0,
  zIndex: tokens.zIndex.modal,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  alignItems: 'center',
});

export const backdrop = style({
  position: 'absolute',
  inset: 0,
  background: tokens.color.overlay,
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  animation: `${fadeIn} 160ms ease`,
});

export const sheet = style({
  position: 'relative',
  width: '100%',
  maxWidth: '480px',
  background: tokens.color.surface,
  borderTopLeftRadius: tokens.radius.xl,
  borderTopRightRadius: tokens.radius.xl,
  padding: `${tokens.space[3]} ${tokens.space[6]} ${tokens.space[6]}`,
  paddingBottom: `calc(${tokens.space[6]} + env(safe-area-inset-bottom))`,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[4],
  boxShadow: '0 -8px 32px rgba(15, 19, 36, 0.12)',
  animation: `${slideUp} 220ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
  maxHeight: '85vh',
  overflowY: 'auto',
});

export const handle = style({
  width: '36px',
  height: '4px',
  borderRadius: '2px',
  background: tokens.color.borderStrong,
  alignSelf: 'center',
  marginBottom: tokens.space[2],
  flex: '0 0 auto',
});

export const title = style({
  fontSize: tokens.fontSize.xl,
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.02em',
  margin: 0,
});

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[3],
});
