import { cx } from 'styled-system/css';
import { type TDividerVariantProps, tDivider } from 'styled-system/recipes';

type DividerProps = TDividerVariantProps & {
  className?: string;
};

export function Divider({ orientation, tone, inset, className }: DividerProps) {
  // variant prop은 ConditionalValue(반응형)라 문자열일 때만 aria로 넘긴다
  const ariaOrientation = typeof orientation === 'string' ? orientation : 'horizontal';
  return <hr aria-orientation={ariaOrientation} className={cx(tDivider({ orientation, tone, inset }), className)} />;
}
