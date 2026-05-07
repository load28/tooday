import { cva, cx } from 'styled-system/css';

/**
 * Dot — 작은 색상 인디케이터. 프로젝트 컬러, 상태 점, 라벨 앞 색칩 등에 사용.
 */
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
  /** 토큰 외 임의 색을 점에 쓰고 싶을 때만 사용. 비워두면 tone 토큰을 따른다. */
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
