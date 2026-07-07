import { cx } from 'styled-system/css';
import { type DotVariantProps, dot } from 'styled-system/recipes';

type DotProps = DotVariantProps & {
  className?: string;
  'aria-label'?: string;
};

export function Dot({ size, tone, className, ...rest }: DotProps) {
  return <span aria-hidden={rest['aria-label'] ? undefined : true} {...rest} className={cx(dot({ size, tone }), className)} />;
}
