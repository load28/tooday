import * as stylex from '@stylexjs/stylex';
import type { ComponentPropsWithoutRef } from 'react';
import type { ControlSx } from '@/styles/sx';
import { anim, color, radii, size as sizeVars } from '@/styles/tokens.stylex';

const styles = stylex.create({
  track: {
    height: sizeVars.xs,
    borderRadius: radii.pill,
    backgroundColor: color.surfaceSoft,
    overflow: 'hidden',
  },
  fill: (ratio: number) => ({
    height: '100%',
    width: `${ratio * 100}%`,
    borderRadius: radii.pill,
    transitionProperty: 'width',
    transitionDuration: anim.durationSlow,
    transitionTimingFunction: anim.easingStandard,
  }),
});

// tone 이름은 Dot과 동일하다 — 팔레트 accent는 프로젝트 색 이름과 1:1로 일치한다
const tones = stylex.create({
  primary: { backgroundColor: color.primary },
  success: { backgroundColor: color.success },
  warning: { backgroundColor: color.warning },
  danger: { backgroundColor: color.danger },
  blue: { backgroundColor: color.brand500 },
  mint: { backgroundColor: color.mint500 },
  violet: { backgroundColor: color.violet500 },
  amber: { backgroundColor: color.amber500 },
  pink: { backgroundColor: color.rose500 },
  gray: { backgroundColor: color.cool500 },
});

export type ProgressBarTone = keyof typeof tones;

type ProgressBarOwnProps = {
  /** 진행 비율 0..1 — 범위를 벗어나면 클램프한다 */
  value: number;
  tone?: ProgressBarTone;
  sx?: ControlSx;
  className?: string;
};

type ProgressBarProps = ProgressBarOwnProps & Omit<ComponentPropsWithoutRef<'div'>, keyof ProgressBarOwnProps | 'style'>;

/** 장식용 진행률 바 — 수치는 곁의 텍스트가 전달하므로 접근성 트리에서는 숨긴다. */
export function ProgressBar({ value, tone = 'primary', sx, className, ...rest }: ProgressBarProps) {
  const ratio = Math.min(1, Math.max(0, value));
  const { className: trackClassName, style: trackStyle } = stylex.props(styles.track, sx);
  return (
    <div aria-hidden {...rest} className={className ? `${trackClassName} ${className}` : trackClassName} style={trackStyle}>
      <div {...stylex.props(styles.fill(ratio), tones[tone])} />
    </div>
  );
}
