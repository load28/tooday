import { style, styleVariants } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const root = style({
  padding: `${tokens.space[4]} ${tokens.space[4]} ${tokens.space[7]}`,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[5],
});

export const titleBlock = style({
  padding: `0 ${tokens.space[2]}`,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[3],
});

export const titleBtn = style({
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontSize: tokens.fontSize.display,
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.03em',
  lineHeight: tokens.lineHeight.tight,
  fontFamily: 'inherit',
  cursor: 'text',
});

export const titleInput = style({
  width: '100%',
  border: 'none',
  background: 'transparent',
  padding: 0,
  paddingBottom: '4px',
  fontSize: tokens.fontSize.display,
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.03em',
  lineHeight: tokens.lineHeight.tight,
  fontFamily: 'inherit',
  outline: 'none',
  borderBottom: `2px solid ${tokens.color.primary}`,
});

/* === Status pill (opens sheet) === */

export const statusPill = style({
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  borderRadius: tokens.radius.pill,
  border: 'none',
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.semibold,
  fontFamily: 'inherit',
  cursor: 'pointer',
  letterSpacing: '-0.01em',
});

export const statusPillVariants = styleVariants({
  todo: {
    background: tokens.color.surfaceMuted,
    color: tokens.color.textSecondary,
  },
  doing: {
    background: tokens.color.primarySoft,
    color: tokens.color.primary,
  },
  done: {
    background: tokens.color.successSoft,
    color: tokens.color.success,
  },
});

export const statusDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
});

export const statusDotVariants = styleVariants({
  todo: { background: tokens.color.borderStrong },
  doing: { background: tokens.color.primary },
  done: { background: tokens.color.success },
});

/* === Meta list (card) === */

export const metaList = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const metaRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  height: '56px',
  padding: `0 ${tokens.space[5]}`,
  border: 'none',
  background: 'transparent',
  fontFamily: 'inherit',
  borderTop: `1px solid ${tokens.color.divider}`,
  selectors: {
    'li:first-of-type > &': { borderTop: 'none' },
  },
});

export const metaRowBtn = style({
  cursor: 'pointer',
  selectors: {
    '&:active': { background: tokens.color.surfaceMuted },
  },
});

export const metaKey = style({
  fontSize: tokens.fontSize.md,
  color: tokens.color.textTertiary,
  fontWeight: tokens.fontWeight.medium,
});

export const metaValue = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: tokens.space[2],
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textPrimary,
});

export const metaProjectDot = style({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
});

export const metaHint = style({
  color: tokens.color.textTertiary,
  fontWeight: tokens.fontWeight.medium,
  fontSize: tokens.fontSize.sm,
});

export const metaChev = style({
  color: tokens.color.textPlaceholder,
});

/* === Section blocks (checklist, memo) === */

export const sectionBlock = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[2],
});

export const sectionTitleRow = style({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  paddingLeft: tokens.space[2],
  paddingRight: tokens.space[2],
});

export const sectionTitle = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textTertiary,
  margin: 0,
  letterSpacing: '-0.01em',
});

export const sectionMeta = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textPlaceholder,
  fontFeatureSettings: '"tnum" 1',
});

/* === Memo (card body) === */

export const memoCard = style({
  padding: tokens.space[5],
});

export const memoInput = style({
  width: '100%',
  minHeight: '120px',
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontFamily: 'inherit',
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.regular,
  color: tokens.color.textPrimary,
  lineHeight: tokens.lineHeight.relaxed,
  resize: 'vertical',
  outline: 'none',
  selectors: {
    '&::placeholder': { color: tokens.color.textPlaceholder },
  },
});

/* === Checklist (card body) === */

export const checklist = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const checkItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[3],
  height: '48px',
  padding: `0 ${tokens.space[5]}`,
  borderTop: `1px solid ${tokens.color.divider}`,
  selectors: {
    '&:first-of-type': { borderTop: 'none' },
  },
});

export const checkBoxBase = style({
  width: '22px',
  height: '22px',
  borderRadius: '7px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
  border: 'none',
  cursor: 'pointer',
});

export const checkBoxDone = style({
  background: tokens.color.primary,
  color: tokens.color.textInverse,
});

export const checkBoxTodo = style({
  background: tokens.color.surface,
  border: `1.5px solid ${tokens.color.borderStrong}`,
});

export const checkInput = style({
  flex: 1,
  minWidth: 0,
  border: 'none',
  background: 'transparent',
  outline: 'none',
  padding: 0,
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.medium,
  color: tokens.color.textPrimary,
  fontFamily: 'inherit',
  selectors: {
    '&::placeholder': { color: tokens.color.textPlaceholder },
  },
});

export const checkInputDone = style({
  color: tokens.color.textTertiary,
  textDecoration: 'line-through',
  textDecorationColor: tokens.color.borderStrong,
});

export const checkRemove = style({
  width: '28px',
  height: '28px',
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: tokens.radius.sm,
  color: tokens.color.textPlaceholder,
  flex: '0 0 auto',
  cursor: 'pointer',
  selectors: {
    '&:active': { background: tokens.color.surfaceMuted },
  },
});

export const addRow = style({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  height: '48px',
  padding: `0 ${tokens.space[5]}`,
  border: 'none',
  borderTop: `1px solid ${tokens.color.divider}`,
  background: 'transparent',
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textTertiary,
  fontFamily: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
});

/* === Delete === */

export const deleteRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '56px',
  padding: `0 ${tokens.space[5]}`,
  border: 'none',
  background: tokens.color.surface,
  fontFamily: 'inherit',
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.danger,
  cursor: 'pointer',
  selectors: {
    '&:active': { background: tokens.color.dangerSoft },
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

export const fieldLabel = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textTertiary,
});

export const fieldInput = style({
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

export const primaryBtn = style({
  width: '100%',
  height: '54px',
  border: 'none',
  borderRadius: tokens.radius.lg,
  background: tokens.color.primary,
  color: tokens.color.textInverse,
  fontSize: tokens.fontSize.lg,
  fontWeight: tokens.fontWeight.bold,
  letterSpacing: '-0.01em',
  cursor: 'pointer',
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
