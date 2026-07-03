import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cva, cx } from 'styled-system/css';

const pressableRecipe = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'md',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'text',
    fontFamily: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'left',
    minWidth: 0,
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
        _press: { bg: 'pressedStrong' },
      },
      subtle: {
        bg: 'surfaceMuted',
        color: 'textSecondary',
        _press: { bg: 'surfaceSoft' },
      },
      brand: {
        bg: 'primary',
        color: 'onPrimary',
        _press: { bg: 'primaryPressed' },
      },
      brandSoft: {
        bg: 'primarySoft',
        color: 'primary',
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
      sm: { height: 'controlSm', paddingX: 'xl', textStyle: 'bodySm' },
      md: { height: 'tap', paddingX: '2xl', textStyle: 'body' },
      lg: { height: 'tapLg', paddingX: '3xl', textStyle: 'bodyLg' },
      xl: { height: 'tapXl', paddingX: '3xl', textStyle: 'bodyLgStrong' },
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
