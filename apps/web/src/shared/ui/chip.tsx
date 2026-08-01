import type { ReactNode } from 'react';
import { type ChipVariantProps, chip } from '@/shared/ui/chip.css';
import { cx } from '@/styles/cx';

type ChipProps = ChipVariantProps & {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function Chip({ tone, size, leading, trailing, className, children }: ChipProps) {
  return (
    <span className={cx(chip({ tone, size }), className)}>
      {leading}
      {children}
      {trailing}
    </span>
  );
}
