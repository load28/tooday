import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { css, cx } from 'styled-system/css';
import { type RowVariantProps, row } from 'styled-system/recipes';

// 스타일은 config recipe(panda.recipes.ts의 `row`). 근거: docs/conventions/ui-styling.md.

type RowBase = RowVariantProps & {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children?: ReactNode;
};

type RowProps<T extends ElementType> = RowBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof RowBase | 'as'>;

const slotLeading = css({ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' });
const slotContent = css({ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2xs', justifyContent: 'center' });
const slotTrailing = css({ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 'md', color: 'textTertiary' });

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
      {leading != null ? <div className={slotLeading}>{leading}</div> : null}
      <div className={slotContent}>{children}</div>
      {trailing != null ? <div className={slotTrailing}>{trailing}</div> : null}
    </Tag>
  );
}
