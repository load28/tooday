import { cx } from 'styled-system/css';
import { type DividerVariantProps, divider } from 'styled-system/recipes';

// 스타일은 config recipe(recipes/*의 `divider`). 근거: docs/conventions/ui-styling.md.

type DividerProps = DividerVariantProps & {
  className?: string;
};

export function Divider({ orientation, tone, inset, className }: DividerProps) {
  // config recipe의 variant prop은 ConditionalValue(반응형 허용)라 문자열일 때만 aria로 넘긴다
  const ariaOrientation = typeof orientation === 'string' ? orientation : 'horizontal';
  return <hr aria-orientation={ariaOrientation} className={cx(divider({ orientation, tone, inset }), className)} />;
}
