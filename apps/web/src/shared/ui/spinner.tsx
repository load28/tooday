import * as stylex from '@stylexjs/stylex';
import type { ComponentPropsWithoutRef } from 'react';
import { useT } from '@/shared/i18n';
import type { ControlSx } from '@/styles/sx';
import { radii } from '@/styles/tokens.stylex';

const styles = stylex.create({
  root: {
    display: 'inline-block',
    flexShrink: 0,
    width: '1em',
    height: '1em',
    borderRadius: radii.full,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'currentcolor',
    borderBottomColor: 'transparent',
    animationName: 'toodaySpin',
    animationDuration: '0.6s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
});

type SpinnerProps = Omit<ComponentPropsWithoutRef<'output'>, 'style' | 'className'> & {
  label?: string;
  sx?: ControlSx;
};

export function Spinner({ label, sx, ...rest }: SpinnerProps) {
  const t = useT();
  return (
    <output
      aria-label={rest['aria-hidden'] ? undefined : (label ?? t.common.loading)}
      {...rest}
      {...stylex.props(styles.root, sx)}
    />
  );
}
