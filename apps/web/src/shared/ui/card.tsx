import { type HTMLMotionProps, motion } from 'framer-motion';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { type CardVariantProps, card } from 'styled-system/recipes';

// TDS식 press 딤 — whileTap이 --press-dim(0↔1)을 스프링으로 구동해 ::before 딤 opacity를 애니메이션한다.
// 색만 바뀌므로 scale은 없다(리스트=축소 X). 색 보간을 피해 opacity로 구동한다.
const PRESS_DIM = { type: 'spring', stiffness: 700, damping: 42, mass: 0.5 } as const;

type CardVariants = CardVariantProps;

type CardBase = CardVariants & {
  className?: string;
  children?: ReactNode;
};

type CardProps<T extends ElementType> = CardBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof CardBase | 'as'>;

export function Card<T extends ElementType = 'div'>(props: CardProps<T>) {
  const { as, elevation, radius, padding, interactive, selected, className, children, ...rest } = props;
  const cls = cx(card({ elevation, radius, padding, interactive, selected }), className);

  // interactive 카드는 항상 버튼 — Framer Motion으로 press 딤을 스프링 구동(TDS와 동일한 방식).
  if (interactive) {
    return (
      <motion.button
        type="button"
        initial={{ '--press-dim': 0 }}
        whileTap={{ '--press-dim': 1 }}
        transition={PRESS_DIM}
        {...(rest as unknown as HTMLMotionProps<'button'>)}
        className={cls}
      >
        {children}
      </motion.button>
    );
  }

  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag {...rest} className={cls}>
      {children}
    </Tag>
  );
}
