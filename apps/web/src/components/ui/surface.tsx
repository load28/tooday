import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cva, cx } from 'styled-system/css';

/**
 * Surface — 배경/테두리/그림자/라운드를 가진 일반 컨테이너 프리미티브.
 * 카드(`tone="surface" elevation="card"`), 머티드 그룹(`tone="muted"`),
 * 인버스 영역(`tone="inverse"`) 등 화면 어디든 배경 영역으로 쓰기 위한 베이스.
 */
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
      sm: { padding: '3' },
      md: { padding: '4' },
      lg: { padding: '5' },
    },
    inset: {
      none: { padding: '0' },
      x: { paddingX: '4' },
      y: { paddingY: '3' },
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
