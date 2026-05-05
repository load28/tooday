import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cva, cx } from 'styled-system/css';

/**
 * Card — Surface의 시멘틱 프리셋. "콘텐츠 묶음" 단위로 쓰는 카드.
 * 카드 내부에는 보통 Row, Stack, Divider가 들어간다.
 */
const cardRecipe = cva({
  base: {
    bg: 'surface',
    borderRadius: 'xl',
    overflow: 'hidden',
    minWidth: 0,
    color: 'text',
    transition: 'box-shadow {durations.fast} {easings.exit}, transform {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
  },
  variants: {
    elevation: {
      flat: { boxShadow: 'none', border: '1px solid {colors.border}' },
      raised: { boxShadow: 'card' },
      floating: { boxShadow: 'lg' },
    },
    radius: {
      md: { borderRadius: 'md' },
      lg: { borderRadius: 'lg' },
      xl: { borderRadius: 'xl' },
      '2xl': { borderRadius: '2xl' },
    },
    padding: {
      none: { padding: '0' },
      sm: { padding: '3' },
      md: { padding: '4' },
      lg: { padding: '5' },
    },
    interactive: {
      true: {
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        // PC(마우스 기기)에서만 살짝 떠오르기
        _hoverable: { _hover: { transform: 'translateY(-1px)' } },
        // 모든 기기: 누르는 순간 살짝 쪼그라들어 "물리적으로 눌림" 피드백
        _press: { transform: 'scale(0.99)' },
      },
    },
    selected: {
      true: {
        boxShadow: '0 0 0 2px {colors.primary}, {shadows.card}',
      },
    },
  },
  defaultVariants: {
    elevation: 'raised',
    radius: 'xl',
    padding: 'none',
  },
});

type CardVariants = NonNullable<Parameters<typeof cardRecipe>[0]>;

type CardBase = CardVariants & {
  className?: string;
  children?: ReactNode;
};

type CardProps<T extends ElementType> = CardBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof CardBase | 'as'>;

export function Card<T extends ElementType = 'div'>(props: CardProps<T>) {
  const { as, elevation, radius, padding, interactive, selected, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag {...rest} className={cx(cardRecipe({ elevation, radius, padding, interactive, selected }), className)}>
      {children}
    </Tag>
  );
}
