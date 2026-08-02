import { style } from '@vanilla-extract/css';
import { ON } from '@/styles/conditions';
import { textStyles } from '@/styles/text-styles';
import { vars } from '@/styles/theme.css';

export const segmentCls = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: vars.space.xs,
  background: vars.color.surfaceSoft,
  borderRadius: vars.radii.lg,
  padding: vars.space.xs,
  marginInline: vars.space.pageX,
  marginTop: vars.space.md,
  marginBottom: vars.space.lg,
});

// 세그먼트 고유 스타일만 — 리셋·포커스 링은 BaseButton이, 선택 룩은 Ark data-state(_on)가 처리한다.
export const segmentButtonCls = style({
  gap: vars.space.sm,
  height: vars.size.controlMd,
  borderRadius: vars.radii.md,
  color: vars.color.textTertiary,
  ...textStyles.bodySm,
  transition: `color ${vars.duration.base} ${vars.easing.standard}, background ${vars.duration.base} ${vars.easing.standard}`,
  selectors: {
    [ON]: { background: vars.color.surface, color: vars.color.text, boxShadow: vars.shadow.sm, fontWeight: 700 },
  },
});

export const listCls = style({ paddingInline: vars.space.pageX, paddingBottom: vars.space['4xl'] });

export const emptyCls = style({ paddingBlock: vars.space.emptyStateY, paddingInline: vars.space['2xl'] });

export const rowCls = style({ width: '100%' });
