import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

/* === Projects index === */

export const intro = style({
  padding: `${tokens.space[3]} ${tokens.space[6]} ${tokens.space[6]}`,
});

export const introTitle = style({
  fontSize: tokens.fontSize.display,
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.03em',
  margin: 0,
  lineHeight: tokens.lineHeight.tight,
});

export const introCaption = style({
  fontSize: tokens.fontSize.md,
  color: tokens.color.textTertiary,
  marginTop: tokens.space[2],
  margin: 0,
  marginBottom: 0,
});

export const projectList = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  paddingBottom: tokens.space[7],
});

export const projectRow = style({
  display: 'block',
  padding: `${tokens.space[4]} ${tokens.space[6]}`,
  borderTop: `1px solid ${tokens.color.divider}`,
  textDecoration: 'none',
  color: 'inherit',
  selectors: {
    'li:first-of-type > &': { borderTop: 'none' },
    '&:active': { background: tokens.color.surfaceMuted },
  },
});

export const projectHead = style({
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[2],
});

export const projectDot = style({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  flex: '0 0 auto',
});

export const projectName = style({
  flex: 1,
  fontSize: tokens.fontSize.xl,
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.02em',
});

export const projectChev = style({
  color: tokens.color.textPlaceholder,
});

export const projectDesc = style({
  fontSize: tokens.fontSize.sm,
  color: tokens.color.textTertiary,
  margin: `${tokens.space[1]} 0 ${tokens.space[3]}`,
  lineHeight: tokens.lineHeight.base,
});

export const progressRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[3],
});

export const progressTrack = style({
  flex: 1,
  height: '4px',
  borderRadius: tokens.radius.pill,
  background: tokens.color.divider,
  overflow: 'hidden',
});

export const progressFill = style({
  height: '100%',
  borderRadius: tokens.radius.pill,
});

export const progressLabel = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textSecondary,
  fontFeatureSettings: '"tnum" 1',
  minWidth: '50px',
  textAlign: 'right',
});

/* === Project detail === */

export const detailHero = style({
  padding: `${tokens.space[3]} ${tokens.space[6]} ${tokens.space[6]}`,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[2],
});

export const detailTitle = style({
  fontSize: tokens.fontSize.display,
  fontWeight: tokens.fontWeight.bold,
  letterSpacing: '-0.03em',
  margin: 0,
  lineHeight: tokens.lineHeight.tight,
  color: tokens.color.textPrimary,
});

export const detailDesc = style({
  fontSize: tokens.fontSize.md,
  color: tokens.color.textTertiary,
  margin: 0,
});

export const detailStat = style({
  display: 'flex',
  alignItems: 'baseline',
  gap: '4px',
  marginTop: tokens.space[2],
  fontFeatureSettings: '"tnum" 1',
});

export const detailStatNum = style({
  fontSize: tokens.fontSize['2xl'],
  fontWeight: tokens.fontWeight.bold,
  color: tokens.color.textPrimary,
  letterSpacing: '-0.02em',
});

export const detailStatTotal = style({
  fontSize: tokens.fontSize.md,
  fontWeight: tokens.fontWeight.medium,
  color: tokens.color.textTertiary,
});

export const detailProgressTrack = style({
  height: '4px',
  borderRadius: tokens.radius.pill,
  background: tokens.color.divider,
  overflow: 'hidden',
  marginTop: tokens.space[1],
});

export const detailProgressFill = style({
  height: '100%',
  borderRadius: tokens.radius.pill,
});

/* === Kanban (vertical) === */

export const kanbanStack = style({
  display: 'flex',
  flexDirection: 'column',
  paddingBottom: tokens.space[7],
});

export const kanbanSection = style({
  display: 'flex',
  flexDirection: 'column',
  selectors: {
    '&:not(:first-of-type)': { marginTop: tokens.space[5] },
  },
});

export const sectionHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${tokens.space[2]} ${tokens.space[6]}`,
});

export const sectionLabel = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textTertiary,
  letterSpacing: '-0.01em',
});

export const sectionCount = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.color.textPlaceholder,
  fontFeatureSettings: '"tnum" 1',
});

export const taskList = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
});

export const sectionEmpty = style({
  padding: `${tokens.space[5]} ${tokens.space[6]}`,
  fontSize: tokens.fontSize.sm,
  color: tokens.color.textPlaceholder,
});
