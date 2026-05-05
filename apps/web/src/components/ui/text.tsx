import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cva, cx } from 'styled-system/css';

const textRecipe = cva({
  base: {
    margin: 0,
    minWidth: 0,
  },
  variants: {
    variant: {
      display: { textStyle: 'display' },
      title: { textStyle: 'title' },
      subtitle: { textStyle: 'subtitle' },
      bodyLg: { textStyle: 'bodyLg' },
      bodyLgStrong: { textStyle: 'bodyLgStrong' },
      body: { textStyle: 'body' },
      bodyStrong: { textStyle: 'bodyStrong' },
      bodySm: { textStyle: 'bodySm' },
      label: { textStyle: 'label' },
      caption: { textStyle: 'caption' },
      captionStrong: { textStyle: 'captionStrong' },
      micro: { textStyle: 'micro' },
      overline: { textStyle: 'overline' },
      numeric: { textStyle: 'numeric' },
    },
    tone: {
      default: { color: 'text' },
      secondary: { color: 'textSecondary' },
      tertiary: { color: 'textTertiary' },
      placeholder: { color: 'textPlaceholder' },
      inverse: { color: 'textInverse' },
      brand: { color: 'textBrand' },
      success: { color: 'success' },
      warning: { color: 'warning' },
      danger: { color: 'danger' },
    },
    truncate: {
      true: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    },
    align: {
      start: { textAlign: 'start' },
      center: { textAlign: 'center' },
      end: { textAlign: 'end' },
    },
  },
  defaultVariants: {
    variant: 'body',
    tone: 'default',
  },
});

type TextVariant = NonNullable<Parameters<typeof textRecipe>[0]>['variant'];
type TextTone = NonNullable<Parameters<typeof textRecipe>[0]>['tone'];
type TextAlign = NonNullable<Parameters<typeof textRecipe>[0]>['align'];

type TextBase = {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextAlign;
  truncate?: boolean;
  className?: string;
  children?: ReactNode;
};

type TextProps<T extends ElementType> = TextBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof TextBase | 'as'>;

export function Text<T extends ElementType = 'span'>(props: TextProps<T>) {
  const { as, variant, tone, align, truncate, className, children, ...rest } = props;
  const Tag = (as ?? 'span') as ElementType;
  return (
    <Tag {...rest} className={cx(textRecipe({ variant, tone, align, truncate }), className)}>
      {children}
    </Tag>
  );
}
