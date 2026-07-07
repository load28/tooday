import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { type CardVariantProps, card } from 'styled-system/recipes';

// 스타일 recipe는 config recipe(recipes/*의 `card`)다 — cva가 아니다.
// recipe 레이어라 사용처 css() override가 항상 이긴다(근거: docs/conventions/ui-styling.md).

type CardVariants = CardVariantProps;

type CardBase = CardVariants & {
  className?: string;
  children?: ReactNode;
};

type CardProps<T extends ElementType> = CardBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof CardBase | 'as'>;

export function Card<T extends ElementType = 'div'>(props: CardProps<T>) {
  const { as, elevation, radius, padding, interactive, selected, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag {...rest} className={cx(card({ elevation, radius, padding, interactive, selected }), className)}>
      {children}
    </Tag>
  );
}
