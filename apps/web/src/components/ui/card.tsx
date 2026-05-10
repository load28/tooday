import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cva, cx } from 'styled-system/css';

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
      sm: { padding: 'cardPadSm' },
      md: { padding: 'cardPadMd' },
      lg: { padding: 'cardPadLg' },
    },
    interactive: {
      true: {
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
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
