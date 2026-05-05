import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { css, cva, cx } from 'styled-system/css';

/**
 * Row — 가로형 리스트 항목 프리미티브.
 * leading(좌측 영역) / content(중앙 텍스트 영역) / trailing(우측 영역) 슬롯 구조.
 *
 * 사용 예:
 *  - Surface나 Card 안에 여러 Row + Divider를 쌓아 리스트를 구성.
 *  - 단독 Row를 캔버스에 두면 "탭 가능한 항목" 형태가 된다.
 */
const rowRecipe = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    minWidth: 0,
    width: '100%',
    color: 'text',
    textAlign: 'left',
    transition: 'background-color {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
  },
  variants: {
    density: {
      compact: { paddingX: '3', paddingY: '2', minHeight: 'tap' },
      comfortable: { paddingX: '4', paddingY: '3', minHeight: 'tapLg' },
      spacious: { paddingX: '4', paddingY: '4', minHeight: '14' },
    },
    align: {
      center: { alignItems: 'center' },
      start: { alignItems: 'flex-start' },
    },
    interactive: {
      true: {
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        _hoverable: { _hover: { bg: 'hoverOverlay' } },
        _press: { bg: 'pressedStrong' },
      },
    },
    inset: {
      none: {},
      flush: { paddingX: '0' },
    },
  },
  defaultVariants: {
    density: 'comfortable',
    align: 'center',
    inset: 'none',
  },
});

type RowVariants = NonNullable<Parameters<typeof rowRecipe>[0]>;

type RowBase = RowVariants & {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children?: ReactNode;
};

type RowProps<T extends ElementType> = RowBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof RowBase | 'as'>;

const slotLeading = css({ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' });
const slotContent = css({ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5', justifyContent: 'center' });
const slotTrailing = css({ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '2', color: 'textTertiary' });

export function Row<T extends ElementType = 'div'>(props: RowProps<T>) {
  const { as, density, align, interactive, inset, leading, trailing, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  const isButton = Tag === 'button';
  return (
    <Tag
      {...(isButton ? { type: 'button' } : null)}
      {...rest}
      className={cx(rowRecipe({ density, align, interactive, inset }), className)}
    >
      {leading != null ? <div className={slotLeading}>{leading}</div> : null}
      <div className={slotContent}>{children}</div>
      {trailing != null ? <div className={slotTrailing}>{trailing}</div> : null}
    </Tag>
  );
}
