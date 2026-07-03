import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { css, cx } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

type AlignToken = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type JustifyToken = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

const ALIGN_MAP: Record<AlignToken, SystemStyleObject['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const JUSTIFY_MAP: Record<JustifyToken, SystemStyleObject['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

type StackBase = {
  gap?: SystemStyleObject['gap'];
  align?: AlignToken;
  justify?: JustifyToken;
  wrap?: boolean;
  inline?: boolean;
  className?: string;
  children?: ReactNode;
};

type StackProps<T extends ElementType> = StackBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof StackBase | 'as'>;

function buildStackClass(direction: 'row' | 'column', { gap, align, justify, wrap, inline }: StackBase) {
  return css({
    display: inline ? 'inline-flex' : 'flex',
    flexDirection: direction,
    gap,
    alignItems: align ? ALIGN_MAP[align] : direction === 'row' ? 'center' : 'stretch',
    justifyContent: justify ? JUSTIFY_MAP[justify] : 'flex-start',
    flexWrap: wrap ? 'wrap' : 'nowrap',
    minWidth: 0,
  });
}

export function Stack<T extends ElementType = 'div'>(props: StackProps<T>) {
  const { as, gap = 'xl', align, justify, wrap, inline, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  const stackClass = buildStackClass('column', { gap, align, justify, wrap, inline });
  return (
    <Tag {...rest} className={cx(stackClass, className)}>
      {children}
    </Tag>
  );
}

export function HStack<T extends ElementType = 'div'>(props: StackProps<T>) {
  const { as, gap = 'md', align, justify, wrap, inline, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  const stackClass = buildStackClass('row', { gap, align, justify, wrap, inline });
  return (
    <Tag {...rest} className={cx(stackClass, className)}>
      {children}
    </Tag>
  );
}

export function Spacer({ size = 'auto' }: { size?: SystemStyleObject['flexBasis'] | 'auto' }) {
  return (
    <span
      aria-hidden="true"
      className={css({
        flexGrow: size === 'auto' ? 1 : 0,
        flexShrink: 0,
        flexBasis: size === 'auto' ? 0 : size,
        alignSelf: 'stretch',
      })}
    />
  );
}
