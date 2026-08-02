import { type TDividerVariantProps, tDivider } from '@/shared/ui/divider.css';
import { cx } from '@/styles/cx';

type DividerProps = TDividerVariantProps & {
  className?: string;
};

export function Divider({ orientation, tone, inset, className }: DividerProps) {
  // variant prop은 ConditionalValue(반응형)라 문자열일 때만 aria로 넘긴다
  const ariaOrientation = typeof orientation === 'string' ? orientation : 'horizontal';
  return <hr aria-orientation={ariaOrientation} className={cx(tDivider({ orientation, tone, inset }), className)} />;
}
