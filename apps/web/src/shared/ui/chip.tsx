import type { ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { type ChipVariantProps, chip } from 'styled-system/recipes';

// 스타일은 config recipe(panda.recipes.ts의 `chip`). 근거: docs/conventions/ui-styling.md.

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
