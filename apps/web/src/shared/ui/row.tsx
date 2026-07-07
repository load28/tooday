import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { type RowVariantProps, row, rowSlotContent, rowSlotLeading, rowSlotTrailing } from 'styled-system/recipes';

type RowBase = RowVariantProps & {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children?: ReactNode;
};

type RowProps<T extends ElementType> = RowBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof RowBase | 'as'>;

export function Row<T extends ElementType = 'div'>(props: RowProps<T>) {
  const { as, density, align, interactive, inset, leading, trailing, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  const isButton = Tag === 'button';
  return (
    <Tag
      {...(isButton ? { type: 'button' } : null)}
      {...rest}
      className={cx(row({ density, align, interactive, inset }), className)}
    >
      {leading != null ? <div className={rowSlotLeading()}>{leading}</div> : null}
      <div className={rowSlotContent()}>{children}</div>
      {trailing != null ? <div className={rowSlotTrailing()}>{trailing}</div> : null}
    </Tag>
  );
}
