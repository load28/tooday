import { cx } from 'styled-system/css';
import { type DotVariantProps, dot } from 'styled-system/recipes';

// 스타일은 config recipe(panda.recipes.ts의 `dot`). 근거: docs/conventions/ui-styling.md.

type DotProps = DotVariantProps & {
  color?: string;
  className?: string;
  'aria-label'?: string;
};

export function Dot({ size, tone, color, className, ...rest }: DotProps) {
  return (
    <span
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
      className={cx(dot({ size, tone }), className)}
      style={color ? { background: color } : undefined}
    />
  );
}
