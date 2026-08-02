import type { ComponentPropsWithoutRef } from 'react';
import { useT } from '@/shared/i18n';
import { spinner } from '@/shared/ui/spinner.css';
import { cx } from '@/styles/cx';

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
