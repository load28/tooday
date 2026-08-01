import type { ComponentPropsWithoutRef } from 'react';
import { type ProgressFillVariantProps, progressFill, progressTrack } from '@/shared/ui/progress-bar.css';
import { cx } from '@/styles/cx';

export type ProgressBarTone = NonNullable<ProgressFillVariantProps['tone']>;

type ProgressBarOwnProps = {
  /** 진행 비율 0..1 — 범위를 벗어나면 클램프한다 */
  value: number;
  tone?: ProgressBarTone;
  className?: string;
};

type ProgressBarProps = ProgressBarOwnProps & Omit<ComponentPropsWithoutRef<'div'>, keyof ProgressBarOwnProps>;

/** 장식용 진행률 바 — 수치는 곁의 텍스트가 전달하므로 접근성 트리에서는 숨긴다. */
export function ProgressBar({ value, tone, className, ...rest }: ProgressBarProps) {
  const ratio = Math.min(1, Math.max(0, value));
  return (
    <div aria-hidden {...rest} className={cx(progressTrack(), className)}>
      <div className={progressFill({ tone })} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
