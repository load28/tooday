import * as stylex from '@stylexjs/stylex';
import { weekCell } from '@/styles/slots.stylex';
import { anim, color, radii, size as sizeVars, space } from '@/styles/tokens.stylex';

const ON = ':is([data-state="on"])';

export const styles = stylex.create({
  strip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space['2xl'],
    paddingInline: space.xl,
  },
  // 셀 고유 스타일만 — 리셋·포커스 링은 BaseButton이, 선택 룩은 Ark data-state(ON)가 처리한다.
  cell: {
    flexDirection: 'column',
    paddingTop: space.md,
    paddingBottom: space.sm,
    borderRadius: radii.lg,
    backgroundColor: { default: null, [ON]: color.primary },
    transitionProperty: 'background-color, color',
    transitionDuration: anim.durationBase,
    transitionTimingFunction: anim.easingStandard,
  },
  dow: { marginBottom: space.xs },
  dot: {
    width: sizeVars.xs,
    height: sizeVars.xs,
    borderRadius: radii.pill,
    marginTop: space.xs,
    backgroundColor: weekCell.dotColor,
  },
});

export const cellTones = stylex.create({
  idle: { color: { default: color.textTertiary, [ON]: color.onPrimary } },
  today: { color: { default: color.primary, [ON]: color.onPrimary } },
});

// 자손(dot)에게 선택 상태를 변수로 전달한다 — StyleX는 자손 셀렉터를 지원하지 않는다.
export const dotMarks = stylex.create({
  none: { [weekCell.dotColor]: 'transparent' },
  tasks: { [weekCell.dotColor]: { default: color.primary, [ON]: color.onPrimaryMuted } },
});
