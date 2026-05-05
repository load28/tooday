import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cva, cx } from 'styled-system/css';

/**
 * Pressable — 탭 가능한 베이스 버튼 프리미티브.
 * 시각적인 톤(없음/소프트/프라이머리/위험)과 셰이프(원형/필/사각)만 정의한다.
 * 패딩, 텍스트는 자식이 결정.
 */
const pressableRecipe = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'text',
    fontFamily: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'left',
    minWidth: 0,
    // 빠질 때만 부드럽게(120ms), 들어갈 때(_press)는 즉시(0ms)
    transition:
      'background-color {durations.fast} {easings.exit}, transform {durations.fast} {easings.exit}, color {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
    _disabled: {
      cursor: 'not-allowed',
      opacity: 0.5,
    },
    _focusVisible: {
      outline: 'none',
      boxShadow: 'focus',
    },
  },
  variants: {
    tone: {
      ghost: {
        color: 'text',
        _hoverable: { _hover: { bg: 'hoverOverlay' } },
        _press: { bg: 'pressedStrong' },
      },
      subtle: {
        bg: 'surfaceMuted',
        color: 'textSecondary',
        _hoverable: { _hover: { bg: 'surfaceSoft' } },
        _press: { bg: 'surfaceSoft' },
      },
      brand: {
        bg: 'primary',
        color: 'onPrimary',
        _hoverable: { _hover: { bg: 'primaryHover' } },
        _press: { bg: 'primaryPressed' },
      },
      brandSoft: {
        bg: 'primarySoft',
        color: 'primary',
        _hoverable: { _hover: { bg: 'primarySofter' } },
        _press: { bg: 'primarySofter' },
      },
      danger: {
        bg: 'danger',
        color: 'textInverse',
        _press: { bg: 'dangerPressed' },
      },
      dangerSoft: {
        bg: 'dangerSoft',
        color: 'danger',
        _press: { bg: 'dangerSoft', filter: 'brightness(0.96)' },
      },
    },
    shape: {
      square: { borderRadius: 'md' },
      rounded: { borderRadius: 'lg' },
      pill: { borderRadius: 'pill' },
      circle: { borderRadius: 'full', aspectRatio: '1 / 1' },
    },
    size: {
      sm: { height: '8', paddingX: '3', textStyle: 'bodySm' },
      md: { height: 'tap', paddingX: '4', textStyle: 'body' },
      lg: { height: 'tapLg', paddingX: '5', textStyle: 'bodyLg' },
      icon: { height: 'tap', width: 'tap', paddingX: '0' },
      iconLg: { height: 'tapLg', width: 'tapLg', paddingX: '0' },
    },
    pressed: {
      true: { transform: 'scale(0.96)' },
    },
  },
  defaultVariants: {
    tone: 'ghost',
    shape: 'rounded',
    size: 'md',
  },
});

type PressableVariants = NonNullable<Parameters<typeof pressableRecipe>[0]>;

type PressableProps = PressableVariants &
  Omit<ComponentPropsWithoutRef<'button'>, keyof PressableVariants> & {
    children?: ReactNode;
  };

export function Pressable({ tone, shape, size, pressed, className, children, type, ...rest }: PressableProps) {
  return (
    <button
      type={type ?? 'button'}
      data-pressable=""
      {...rest}
      className={cx(pressableRecipe({ tone, shape, size, pressed }), className)}
    >
      {children}
    </button>
  );
}
