import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { type TextVariantProps, text } from '@/shared/ui/text.css';
import { cx } from '@/styles/cx';

type TextVariant = TextVariantProps['variant'];
type TextTone = TextVariantProps['tone'];
type TextAlign = TextVariantProps['align'];

type TextBase = {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextAlign;
  truncate?: boolean;
  /** 완료 항목 취소선 — 색은 tone으로 함께 지정한다 */
  strike?: boolean;
  className?: string;
  children?: ReactNode;
};

type TextProps<T extends ElementType> = TextBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof TextBase | 'as'>;

export function Text<T extends ElementType = 'span'>(props: TextProps<T>) {
  const { as, variant, tone, align, truncate, strike, className, children, ...rest } = props;
  const Tag = (as ?? 'span') as ElementType;
  return (
    <Tag {...rest} className={cx(text({ variant, tone, align, truncate, strike }), className)}>
      {children}
    </Tag>
  );
}
