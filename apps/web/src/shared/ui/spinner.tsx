import type { ComponentPropsWithoutRef } from 'react';
import { cx } from 'styled-system/css';
import { spinner } from 'styled-system/recipes';
import { useT } from '@/shared/i18n';

type SpinnerProps = ComponentPropsWithoutRef<'output'> & {
  label?: string;
};

export function Spinner({ label, className, ...rest }: SpinnerProps) {
  const t = useT();
  return (
    <output
      aria-label={rest['aria-hidden'] ? undefined : (label ?? t.common.loading)}
      {...rest}
      className={cx(spinner(), className)}
    />
  );
}
