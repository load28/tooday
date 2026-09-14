import * as stylex from '@stylexjs/stylex';
import { type HTMLMotionProps, motion } from 'framer-motion';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import type { SurfaceSx } from '@/styles/sx';
import { anim, color, radii, shadow, space } from '@/styles/tokens.stylex';

// TDS식 press 딤 — whileTap이 --press-dim(0↔1)을 스프링으로 구동해 ::before 딤 opacity를 애니메이션한다.
// 색만 바뀌므로 scale은 없다(리스트=축소 X). 색 보간을 피해 opacity로 구동한다.
const PRESS_DIM = { type: 'spring', stiffness: 700, damping: 42, mass: 0.5 } as const;

const base = stylex.create({
  root: {
    backgroundColor: color.surface,
    overflow: 'hidden',
    minWidth: 0,
    color: color.text,
    transitionProperty: 'box-shadow',
    transitionDuration: anim.durationFast,
    transitionTimingFunction: anim.easingExit,
  },
  interactive: {
    position: 'relative',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    userSelect: 'none',
    outline: { default: null, ':is(:focus-visible, [data-focus-visible])': 'none' },
    boxShadow: { default: null, ':is(:focus-visible, [data-focus-visible])': shadow.focus },
    // press 딤 — 크기 무관 state layer 오버레이(::before). --press-dim을 Framer Motion whileTap이 구동한다.
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundColor: color.statePressed,
      opacity: 'var(--press-dim, 0)',
    },
  },
  selected: { boxShadow: `0 0 0 2px ${color.primary}, ${shadow.card}` },
});

const elevations = stylex.create({
  flat: { boxShadow: 'none', borderWidth: '1px', borderStyle: 'solid', borderColor: color.border },
  raised: { boxShadow: shadow.card },
  floating: { boxShadow: shadow.lg },
});

const radiuses = stylex.create({
  md: { borderRadius: radii.md },
  lg: { borderRadius: radii.lg },
  xl: { borderRadius: radii.xl },
  '2xl': { borderRadius: radii['2xl'] },
});

const paddings = stylex.create({
  none: { padding: 0 },
  sm: { padding: space.cardPadSm },
  md: { padding: space.cardPadMd },
  lg: { padding: space.cardPadLg },
});

type CardBase = {
  elevation?: keyof typeof elevations;
  radius?: keyof typeof radiuses;
  padding?: keyof typeof paddings;
  interactive?: boolean;
  selected?: boolean;
  sx?: SurfaceSx;
  children?: ReactNode;
};

type CardProps<T extends ElementType> = CardBase & { as?: T } & Omit<
    ComponentPropsWithoutRef<T>,
    keyof CardBase | 'as' | 'className' | 'style'
  >;

export function Card<T extends ElementType = 'div'>(props: CardProps<T>) {
  const { as, elevation = 'raised', radius = 'xl', padding = 'none', interactive, selected, sx, children, ...rest } = props;
  const styleProps = stylex.props(
    base.root,
    elevations[elevation],
    radiuses[radius],
    paddings[padding],
    interactive && base.interactive,
    selected && base.selected,
    sx,
  );

  // interactive 카드는 항상 버튼 — Framer Motion으로 press 딤을 스프링 구동(TDS와 동일한 방식).
  if (interactive) {
    return (
      <motion.button
        type="button"
        initial={{ '--press-dim': 0 }}
        whileTap={{ '--press-dim': 1 }}
        transition={PRESS_DIM}
        {...(rest as unknown as HTMLMotionProps<'button'>)}
        {...styleProps}
      >
        {children}
      </motion.button>
    );
  }

  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag {...rest} {...styleProps}>
      {children}
    </Tag>
  );
}
