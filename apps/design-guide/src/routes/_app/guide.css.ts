import { style } from '@vanilla-extract/css';
import { tokens } from '@/styles/theme.css';

export const root = style({
  padding: `${tokens.space[2]} ${tokens.space[6]} ${tokens.space[7]}`,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[6],
});

export const heroTitle = style({
  fontSize: tokens.fontSize['3xl'],
  fontWeight: tokens.fontWeight.bold,
  letterSpacing: '-0.025em',
  margin: 0,
});

export const heroDesc = style({
  fontSize: tokens.fontSize.md,
  color: tokens.color.textTertiary,
  margin: 0,
  marginTop: tokens.space[2],
});

export const block = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[3],
});

export const blockHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const blockTitle = style({
  fontSize: tokens.fontSize.xl,
  fontWeight: tokens.fontWeight.bold,
  margin: 0,
  letterSpacing: '-0.02em',
});

export const blockCaption = style({
  fontSize: tokens.fontSize.sm,
  color: tokens.color.textTertiary,
  margin: 0,
});

export const swatchGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: tokens.space[3],
});

export const swatch = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const swatchChip = style({
  height: '64px',
  borderRadius: tokens.radius.md,
  border: `1px solid ${tokens.color.border}`,
});

export const swatchLabel = style({
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
});

export const swatchValue = style({
  fontSize: tokens.fontSize.xs,
  color: tokens.color.textTertiary,
  fontFeatureSettings: '"tnum" 1',
});

export const typeRow = style({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: tokens.space[3],
  padding: `${tokens.space[3]} 0`,
  borderBottom: `1px solid ${tokens.color.divider}`,
});

export const typeLabel = style({
  fontSize: tokens.fontSize.sm,
  color: tokens.color.textTertiary,
  fontWeight: tokens.fontWeight.medium,
});

export const spaceRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: tokens.space[3],
});

export const spaceBar = style({
  height: '14px',
  background: tokens.color.primarySoft,
  borderRadius: tokens.radius.sm,
});

export const radiusRow = style({
  display: 'flex',
  gap: tokens.space[3],
  flexWrap: 'wrap',
});

export const radiusChip = style({
  width: '76px',
  height: '76px',
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.border}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: tokens.fontSize.xs,
  color: tokens.color.textTertiary,
});

export const buttonRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space[2],
});

export const inlineRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: tokens.space[2],
});
