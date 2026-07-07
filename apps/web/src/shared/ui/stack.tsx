import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { spacer, stack } from 'styled-system/recipes';

// 스타일은 config recipe(recipes/*의 `stack`/`spacer`). 근거: docs/conventions/ui-styling.md.
// alignItems 정렬 기본값은 컴포넌트가 align에 넣어 넘긴다(recipe에서 direction과 겹치지 않게).

type AlignToken = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type JustifyToken = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
type GapToken = '0' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

type StackBase = {
  gap?: GapToken;
  align?: AlignToken;
  justify?: JustifyToken;
  wrap?: boolean;
  inline?: boolean;
  className?: string;
  children?: ReactNode;
};

type StackProps<T extends ElementType> = StackBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof StackBase | 'as'>;

export function Stack<T extends ElementType = 'div'>(props: StackProps<T>) {
  const { as, gap = 'xl', align, justify, wrap, inline, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  const cls = stack({
    direction: 'column',
    gap,
    align: align ?? 'stretch',
    justify: justify ?? 'start',
    wrap: Boolean(wrap),
    inline: Boolean(inline),
  });
  return (
    <Tag {...rest} className={cx(cls, className)}>
      {children}
    </Tag>
  );
}

export function HStack<T extends ElementType = 'div'>(props: StackProps<T>) {
  const { as, gap = 'md', align, justify, wrap, inline, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  const cls = stack({
    direction: 'row',
    gap,
    align: align ?? 'center',
    justify: justify ?? 'start',
    wrap: Boolean(wrap),
    inline: Boolean(inline),
  });
  return (
    <Tag {...rest} className={cx(cls, className)}>
      {children}
    </Tag>
  );
}

type SpacerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'auto';

export function Spacer({ size = 'auto' }: { size?: SpacerSize }) {
  return <span aria-hidden="true" className={spacer({ size })} />;
}
