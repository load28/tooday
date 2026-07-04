import type { ComponentPropsWithoutRef } from 'react';
import { cva, cx } from 'styled-system/css';

const spinnerRecipe = cva({
  base: {
    display: 'inline-block',
    flexShrink: 0,
    width: '1em',
    height: '1em',
    borderRadius: 'full',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'currentcolor',
    borderBottomColor: 'transparent',
    animation: 'toodaySpin 0.6s linear infinite',
  },
});

type SpinnerProps = ComponentPropsWithoutRef<'output'> & {
  label?: string;
};

export function Spinner({ label = '로딩 중', className, ...rest }: SpinnerProps) {
  return <output aria-label={rest['aria-hidden'] ? undefined : label} {...rest} className={cx(spinnerRecipe(), className)} />;
}
