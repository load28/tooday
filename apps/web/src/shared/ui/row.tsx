import { type HTMLMotionProps, motion } from 'framer-motion';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { type RowVariantProps, row, rowSlotContent, rowSlotLeading, rowSlotTrailing } from 'styled-system/recipes';

// TDS식 press 딤 — whileTap이 --press-dim(0↔1)을 스프링 구동해 ::before 딤 opacity를 애니메이션한다.
const PRESS_DIM = { type: 'spring', stiffness: 700, damping: 42, mass: 0.5 } as const;

type RowBase = RowVariantProps & {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children?: ReactNode;
};

type RowProps<T extends ElementType> = RowBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof RowBase | 'as'>;

export function Row<T extends ElementType = 'div'>(props: RowProps<T>) {
  const { as, density, align, interactive, inset, leading, trailing, className, children, ...rest } = props;
  const cls = cx(row({ density, align, interactive, inset }), className);
  const slots = (
    <>
      {leading != null ? <div className={rowSlotLeading()}>{leading}</div> : null}
      <div className={rowSlotContent()}>{children}</div>
      {trailing != null ? <div className={rowSlotTrailing()}>{trailing}</div> : null}
    </>
  );

  // interactive 로우는 항상 버튼 — Framer Motion으로 press 딤을 스프링 구동(TDS와 동일한 방식).
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
        {slots}
      </motion.button>
    );
  }

  const Tag = (as ?? 'div') as ElementType;
  const isButton = Tag === 'button';
  return (
    <Tag {...(isButton ? { type: 'button' } : null)} {...rest} className={cls}>
      {slots}
    </Tag>
  );
}
