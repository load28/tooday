import { type DotVariantProps, dot } from '@/shared/ui/dot.css';
import { cx } from '@/styles/cx';

type DotProps = DotVariantProps & {
  className?: string;
  'aria-label'?: string;
};

export function Dot({ size, tone, className, ...rest }: DotProps) {
  return <span aria-hidden={rest['aria-label'] ? undefined : true} {...rest} className={cx(dot({ size, tone }), className)} />;
}
