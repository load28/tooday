import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cva, cx } from 'styled-system/css';

const surfaceRecipe = cva({
  base: {
    minWidth: 0,
    transition: 'background-color {durations.fast} {easings.standard}',
  },
  variants: {
    tone: {
      canvas: { bg: 'bg' },
      canvasWarm: { bg: 'bgWarm' },
      surface: { bg: 'surface' },
      muted: { bg: 'surfaceMuted' },
      soft: { bg: 'surfaceSoft' },
      inverse: { bg: 'surfaceInverse', color: 'textInverse' },
      brandSoft: { bg: 'primarySoft', color: 'primary' },
      successSoft: { bg: 'successSoft', color: 'success' },
      warningSoft: { bg: 'warningSoft', color: 'warning' },
      dangerSoft: { bg: 'dangerSoft', color: 'danger' },
      transparent: { bg: 'transparent' },
    },
    bordered: {
      none: {},
      hairline: { border: '1px solid {colors.border}' },
      strong: { border: '1px solid {colors.borderStrong}' },
    },
    radius: {
      none: { borderRadius: '0' },
      sm: { borderRadius: 'sm' },
      md: { borderRadius: 'md' },
      lg: { borderRadius: 'lg' },
      xl: { borderRadius: 'xl' },
      '2xl': { borderRadius: '2xl' },
      '3xl': { borderRadius: '3xl' },
      pill: { borderRadius: 'pill' },
    },
    elevation: {
      none: { boxShadow: 'none' },
      xs: { boxShadow: 'xs' },
      sm: { boxShadow: 'sm' },
      md: { boxShadow: 'md' },
      card: { boxShadow: 'card' },
      lg: { boxShadow: 'lg' },
    },
    padding: {
      none: { padding: '0' },
      sm: { padding: 'cardPadSm' },
      md: { padding: 'cardPadMd' },
      lg: { padding: 'cardPadLg' },
    },
    inset: {
      none: { padding: '0' },
      x: { paddingX: 'pageX' },
      y: { paddingY: 'xl' },
    },
  },
  defaultVariants: {
    tone: 'surface',
    radius: 'none',
    elevation: 'none',
    bordered: 'none',
  },
});

type SurfaceVariants = NonNullable<Parameters<typeof surfaceRecipe>[0]>;

type SurfaceBase = SurfaceVariants & {
  className?: string;
  children?: ReactNode;
};

type SurfaceProps<T extends ElementType> = SurfaceBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof SurfaceBase | 'as'>;

export function Surface<T extends ElementType = 'div'>(props: SurfaceProps<T>) {
  const { as, tone, radius, elevation, padding, inset, bordered, className, children, ...rest } = props;
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag {...rest} className={cx(surfaceRecipe({ tone, radius, elevation, padding, inset, bordered }), className)}>
      {children}
    </Tag>
  );
}
