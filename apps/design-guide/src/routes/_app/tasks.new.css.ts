import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  padding: `${tokens.space[4]} ${tokens.space[6]} ${tokens.space[7]}`,
  gap: tokens.space[6],
});

export const titleInput = style({
  width: '100%',
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontSize: tokens.fontSize.display,
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.03em',
  lineHeight: tokens.lineHeight.tight,
  fontFamily: 'inherit',
  outline: 'none',
  selectors: {
    '&::placeholder': { color: tokens.color.textPlaceholder },
  },
});

export const fieldList = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  borderTop: `1px solid ${tokens.color.divider}`,
  borderBottom: `1px solid ${tokens.color.divider}`,
});

export const fieldRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  height: '56px',
  padding: 0,
  border: 'none',
  background: 'transparent',
  fontFamily: 'inherit',
  cursor: 'pointer',
  borderTop: `1px solid ${tokens.color.divider}`,
  selectors: {
    'li:first-of-type &': { borderTop: 'none' },
    '&:active': { background: tokens.color.surfaceMuted },
  },
});

export const fieldLabel = style({
  fontSize: tokens.fontSize.md,
  color: tokens.color.textTertiary,
  fontWeight: tokens.fontWeight.medium,
});

export const fieldValue = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: tokens.space[2],
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textPrimary,
});

export const fieldHint = style({
  color: tokens.color.textTertiary,
  fontWeight: tokens.fontWeight.medium,
  fontSize: tokens.fontSize.sm,
});

export const dot = style({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
});

export const chevron = style({
  color: tokens.color.textPlaceholder,
});

export const memoBlock = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[2],
});

export const sectionLabel = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textTertiary,
  letterSpacing: '-0.01em',
});

export const memoInput = style({
  width: '100%',
  minHeight: '120px',
  border: 'none',
  borderBottom: `1px solid ${tokens.color.divider}`,
  background: 'transparent',
  padding: `${tokens.space[2]} 0`,
  fontFamily: 'inherit',
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.regular,
  color: tokens.color.textPrimary,
  lineHeight: tokens.lineHeight.relaxed,
  resize: 'vertical',
  outline: 'none',
  selectors: {
    '&::placeholder': { color: tokens.color.textPlaceholder },
    '&:focus': { borderBottomColor: tokens.color.primary },
  },
});

export const primaryBtn = style({
  width: '100%',
  height: '56px',
  border: 'none',
  borderRadius: tokens.radius.lg,
  background: tokens.color.primary,
  color: tokens.color.textInverse,
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.bold,
  letterSpacing: '-0.01em',
  cursor: 'pointer',
  marginTop: tokens.space[3],
  selectors: {
    '&:active': { background: tokens.color.primaryHover },
    '&:disabled': { background: tokens.color.borderStrong, cursor: 'not-allowed' },
  },
});

/* === Sheet form === */

export const formStack = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[4],
});

export const field = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[2],
});

export const fieldSheetLabel = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textTertiary,
});

export const sheetInput = style({
  width: '100%',
  height: '52px',
  padding: `0 ${tokens.space[4]}`,
  border: `1px solid ${tokens.color.border}`,
  borderRadius: tokens.radius.md,
  background: tokens.color.surface,
  fontFamily: 'inherit',
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textPrimary,
  outline: 'none',
  selectors: {
    '&:focus': { borderColor: tokens.color.primary },
  },
});

export const pillRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: tokens.space[2],
});

export const pill = style({
  height: '40px',
  padding: `0 ${tokens.space[4]}`,
  border: `1px solid ${tokens.color.border}`,
  background: tokens.color.surface,
  borderRadius: tokens.radius.pill,
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textSecondary,
  fontFamily: 'inherit',
  cursor: 'pointer',
});

export const pillActive = style({
  background: tokens.color.primary,
  color: tokens.color.textInverse,
  borderColor: tokens.color.primary,
});

export const optionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  listStyle: 'none',
  padding: 0,
  margin: 0,
});

export const optionRow = style({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[3],
  padding: `${tokens.space[3]} ${tokens.space[2]}`,
  border: 'none',
  background: 'transparent',
  fontFamily: 'inherit',
  borderRadius: tokens.radius.md,
  cursor: 'pointer',
  selectors: {
    '&:active': { background: tokens.color.surfaceMuted },
  },
});

export const optionDot = style({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  flex: '0 0 auto',
});

export const optionLabel = style({
  flex: 1,
  textAlign: 'left',
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textPrimary,
});
