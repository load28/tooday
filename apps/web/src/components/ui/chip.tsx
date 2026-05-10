import type { ReactNode } from 'react';
import { cva, cx } from 'styled-system/css';

const chipRecipe = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'sm',
    paddingX: 'md',
    paddingY: '2xs',
    borderRadius: 'pill',
    textStyle: 'caption',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  variants: {
    tone: {
      neutral: { bg: 'surfaceSoft', color: 'textSecondary' },
      brand: { bg: 'primarySoft', color: 'primary' },
      success: { bg: 'successSoft', color: 'success' },
      warning: { bg: 'warningSoft', color: 'warning' },
      danger: { bg: 'dangerSoft', color: 'danger' },
      outline: { bg: 'transparent', color: 'textSecondary', border: '1px solid {colors.border}' },
    },
    size: {
      sm: { textStyle: 'micro', paddingY: '0' },
      md: { textStyle: 'caption' },
      lg: { textStyle: 'bodySm', paddingY: 'xs', paddingX: 'xl' },
    },
  },
  defaultVariants: {
    tone: 'neutral',
    size: 'md',
  },
});

type ChipVariants = NonNullable<Parameters<typeof chipRecipe>[0]>;

type ChipProps = ChipVariants & {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function Chip({ tone, size, leading, trailing, className, children }: ChipProps) {
  return (
    <span className={cx(chipRecipe({ tone, size }), className)}>
      {leading}
      {children}
      {trailing}
    </span>
  );
}
