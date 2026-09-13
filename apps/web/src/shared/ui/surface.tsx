import * as stylex from '@stylexjs/stylex';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import type { SurfaceSx } from '@/styles/sx';
import { anim, color, radii, shadow, space } from '@/styles/tokens.stylex';

const base = stylex.create({
  root: {
    minWidth: 0,
    transitionProperty: 'background-color',
    transitionDuration: anim.durationFast,
    transitionTimingFunction: anim.easingStandard,
  },
});

const tones = stylex.create({
  canvas: { backgroundColor: color.bg },
  canvasWarm: { backgroundColor: color.bgWarm },
  surface: { backgroundColor: color.surface },
  muted: { backgroundColor: color.surfaceMuted },
  soft: { backgroundColor: color.surfaceSoft },
  inverse: { backgroundColor: color.surfaceInverse, color: color.textInverse },
  brandSoft: { backgroundColor: color.primarySoft, color: color.primary },
  successSoft: { backgroundColor: color.successSoft, color: color.success },
  warningSoft: { backgroundColor: color.warningSoft, color: color.warning },
  dangerSoft: { backgroundColor: color.dangerSoft, color: color.danger },
  transparent: { backgroundColor: 'transparent' },
});

const borders = stylex.create({
  none: {},
  hairline: { borderWidth: '1px', borderStyle: 'solid', borderColor: color.border },
  strong: { borderWidth: '1px', borderStyle: 'solid', borderColor: color.borderStrong },
});

const radiuses = stylex.create({
  none: { borderRadius: 0 },
  sm: { borderRadius: radii.sm },
  md: { borderRadius: radii.md },
  lg: { borderRadius: radii.lg },
  xl: { borderRadius: radii.xl },
  '2xl': { borderRadius: radii['2xl'] },
  '3xl': { borderRadius: radii['3xl'] },
  pill: { borderRadius: radii.pill },
});

const elevations = stylex.create({
  none: { boxShadow: 'none' },
  xs: { boxShadow: shadow.xs },
  sm: { boxShadow: shadow.sm },
  md: { boxShadow: shadow.md },
  card: { boxShadow: shadow.card },
  lg: { boxShadow: shadow.lg },
});

const paddings = stylex.create({
  none: { padding: 0 },
  sm: { padding: space.cardPadSm },
  md: { padding: space.cardPadMd },
  lg: { padding: space.cardPadLg },
});

const insets = stylex.create({
  none: { padding: 0 },
  x: { paddingInline: space.pageX },
  y: { paddingBlock: space.xl },
});

type SurfaceBase = {
  tone?: keyof typeof tones;
  bordered?: keyof typeof borders;
  radius?: keyof typeof radiuses;
  elevation?: keyof typeof elevations;
  padding?: keyof typeof paddings;
  inset?: keyof typeof insets;
  sx?: SurfaceSx;
  className?: string;
  children?: ReactNode;
};

type SurfaceProps<T extends ElementType> = SurfaceBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof SurfaceBase | 'as'>;

export function Surface<T extends ElementType = 'div'>(props: SurfaceProps<T>) {
  const {
    as,
    tone = 'surface',
    radius = 'none',
    elevation = 'none',
    bordered = 'none',
    padding,
    inset,
    sx,
    className,
    children,
    ...rest
  } = props;
  const Tag = (as ?? 'div') as ElementType;
  const { className: sxClassName, style } = stylex.props(
    base.root,
    tones[tone],
    borders[bordered],
    radiuses[radius],
    elevations[elevation],
    padding && paddings[padding],
    inset && insets[inset],
    sx,
  );
  return (
    <Tag {...rest} className={className ? `${sxClassName} ${className}` : sxClassName} style={style}>
      {children}
    </Tag>
  );
}
