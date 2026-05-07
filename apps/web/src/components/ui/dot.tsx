import { cva, cx } from 'styled-system/css';

const dotRecipe = cva({
  base: {
    display: 'inline-block',
    flexShrink: 0,
    borderRadius: 'full',
  },
  variants: {
    size: {
      xs: { width: '1', height: '1' },
      sm: { width: '1.5', height: '1.5' },
      md: { width: '2', height: '2' },
      lg: { width: '2.5', height: '2.5' },
    },
    tone: {
      primary: { bg: 'primary' },
      success: { bg: 'success' },
      warning: { bg: 'warning' },
      danger: { bg: 'danger' },
      neutral: { bg: 'borderStrong' },
      muted: { bg: 'border' },
    },
  },
  defaultVariants: {
    size: 'sm',
    tone: 'neutral',
  },
});

type DotVariants = NonNullable<Parameters<typeof dotRecipe>[0]>;

type DotProps = DotVariants & {
  color?: string;
  className?: string;
  'aria-label'?: string;
};

export function Dot({ size, tone, color, className, ...rest }: DotProps) {
  return (
    <span
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
      className={cx(dotRecipe({ size, tone }), className)}
      style={color ? { background: color } : undefined}
    />
  );
}
