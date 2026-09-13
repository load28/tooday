import * as stylex from '@stylexjs/stylex';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import type { TextSx } from '@/styles/sx';
import { text as textStyles } from '@/styles/text.styles';
import { color } from '@/styles/tokens.stylex';

const base = stylex.create({
  root: { margin: 0, minWidth: 0 },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  // 완료 항목 취소선 — 색은 tone이 관리하므로 여기서는 장식선만 얹는다
  strike: { textDecoration: 'line-through', textDecorationColor: color.borderStrong },
});

const tones = stylex.create({
  default: { color: color.text },
  secondary: { color: color.textSecondary },
  tertiary: { color: color.textTertiary },
  placeholder: { color: color.textPlaceholder },
  inverse: { color: color.textInverse },
  brand: { color: color.textBrand },
  success: { color: color.success },
  warning: { color: color.warning },
  danger: { color: color.danger },
});

const aligns = stylex.create({
  start: { textAlign: 'start' },
  center: { textAlign: 'center' },
  end: { textAlign: 'end' },
});

type TextVariant = keyof typeof textStyles;
type TextTone = keyof typeof tones;
type TextAlign = keyof typeof aligns;

type TextBase = {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextAlign;
  truncate?: boolean;
  /** 완료 항목 취소선 — 색은 tone으로 함께 지정한다 */
  strike?: boolean;
  /** 배치용 StyleX 스타일. 베이스 뒤에 병합되므로 겹치는 속성은 이쪽이 이긴다. */
  sx?: TextSx;
  className?: string;
  children?: ReactNode;
};

type TextProps<T extends ElementType> = TextBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof TextBase | 'as'>;

export function Text<T extends ElementType = 'span'>(props: TextProps<T>) {
  const { as, variant = 'body', tone = 'default', align, truncate, strike, sx, className, children, ...rest } = props;
  const Tag = (as ?? 'span') as ElementType;
  const { className: sxClassName, style } = stylex.props(
    base.root,
    textStyles[variant],
    tones[tone],
    align && aligns[align],
    truncate && base.truncate,
    strike && base.strike,
    sx,
  );
  return (
    <Tag {...rest} className={className ? `${sxClassName} ${className}` : sxClassName} style={style}>
      {children}
    </Tag>
  );
}
