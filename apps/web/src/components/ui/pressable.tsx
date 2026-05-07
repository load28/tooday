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
    transition:
      'background-color {durations.fast} {easings.standard}, transform {durations.fast} {easings.standard}, color {durations.fast} {easings.standard}',
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
        _hover: { bg: 'pressed' },
        _active: { bg: 'pressedStrong' },
      },
      subtle: {
        bg: 'surfaceMuted',
        color: 'textSecondary',
        _hover: { bg: 'surfaceSoft' },
      },
      brand: {
        bg: 'primary',
        color: 'onPrimary',
        _hover: { bg: 'primaryHover' },
      },
      brandSoft: {
        bg: 'primarySoft',
        color: 'primary',
        _hover: { bg: 'primarySofter' },
      },
      danger: {
        bg: 'danger',
        color: 'textInverse',
      },
      dangerSoft: {
        bg: 'dangerSoft',
        color: 'danger',
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
    <button type={type ?? 'button'} {...rest} className={cx(pressableRecipe({ tone, shape, size, pressed }), className)}>
      {children}
    </button>
  );
}
