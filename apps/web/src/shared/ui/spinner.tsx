import type { ComponentPropsWithoutRef } from 'react';
import { cx } from 'styled-system/css';
import { spinner } from 'styled-system/recipes';

// 스타일은 config recipe(panda.recipes.ts의 `spinner`). 근거: docs/conventions/ui-styling.md.

type SpinnerProps = ComponentPropsWithoutRef<'output'> & {
  label?: string;
};

export function Spinner({ label = '로딩 중', className, ...rest }: SpinnerProps) {
  return <output aria-label={rest['aria-hidden'] ? undefined : label} {...rest} className={cx(spinner(), className)} />;
}
