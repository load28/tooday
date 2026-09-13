import * as stylex from '@stylexjs/stylex';
import { anim, color, radii, shadow, size as sizeVars, space } from '@/styles/tokens.stylex';

const ON = ':is([data-state="on"])';

export const styles = stylex.create({
  segment: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: space.xs,
    backgroundColor: color.surfaceSoft,
    borderRadius: radii.lg,
    padding: space.xs,
    marginInline: space.pageX,
    marginTop: space.md,
    marginBottom: space.lg,
  },
  // 세그먼트 고유 스타일만 — 리셋·포커스 링은 BaseButton이, 선택 룩은 Ark data-state(ON)가 처리한다.
  segmentButton: {
    gap: space.sm,
    height: sizeVars.controlMd,
    borderRadius: radii.md,
    color: { default: color.textTertiary, [ON]: color.text },
    backgroundColor: { default: null, [ON]: color.surface },
    boxShadow: { default: null, [ON]: shadow.sm },
    fontWeight: { default: null, [ON]: 700 },
    transitionProperty: 'color, background-color',
    transitionDuration: anim.durationBase,
    transitionTimingFunction: anim.easingStandard,
  },
  list: { paddingInline: space.pageX, paddingBottom: space['4xl'] },
  empty: { paddingBlock: space.emptyStateY, paddingInline: space['2xl'] },
  row: { width: '100%' },
});
