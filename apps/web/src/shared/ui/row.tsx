import * as stylex from '@stylexjs/stylex';
import { type HTMLMotionProps, motion } from 'framer-motion';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import type { ControlSx } from '@/styles/sx';
import { anim, color, shadow, size as sizeVars, space } from '@/styles/tokens.stylex';

// TDS식 press 딤 — whileTap이 --press-dim(0↔1)을 스프링 구동해 ::before 딤 opacity를 애니메이션한다.
const PRESS_DIM = { type: 'spring', stiffness: 700, damping: 42, mass: 0.5 } as const;

const base = stylex.create({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xl,
    minWidth: 0,
    width: '100%',
    color: color.text,
    textAlign: 'left',
    transitionProperty: 'background-color',
    transitionTimingFunction: anim.easingExit,
    transitionDuration: {
      default: anim.durationFast,
      ':not(:disabled):active': '0ms',
      ':not(:disabled)[data-pressed="true"]': '0ms',
    },
  },
  interactive: {
    position: 'relative',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    userSelect: 'none',
    outline: { default: null, ':is(:focus-visible, [data-focus-visible])': 'none' },
    boxShadow: { default: null, ':is(:focus-visible, [data-focus-visible])': shadow.focus },
    // press 딤 — Row 컴포넌트의 whileTap이 --press-dim으로 opacity를 스프링 구동한다(TDS와 동형).
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      borderRadius: 'inherit',
      backgroundColor: color.statePressed,
      opacity: 'var(--press-dim, 0)',
    },
  },
  slotLeading: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  slotContent: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space['2xs'],
    justifyContent: 'center',
  },
  slotTrailing: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    color: color.textTertiary,
  },
});

const densities = stylex.create({
  compact: { paddingInline: space.xl, paddingBlock: space.md, minHeight: sizeVars.tap },
  comfortable: { paddingInline: space['2xl'], paddingBlock: space.xl, minHeight: sizeVars.tapLg },
  spacious: { paddingInline: space['2xl'], paddingBlock: space['2xl'], minHeight: sizeVars.tapXl },
});

const aligns = stylex.create({
  center: { alignItems: 'center' },
  start: { alignItems: 'flex-start' },
});

const insets = stylex.create({
  none: {},
  flush: { paddingInline: 0 },
});

type RowBase = {
  density?: keyof typeof densities;
  align?: keyof typeof aligns;
  inset?: keyof typeof insets;
  interactive?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  sx?: ControlSx;
  className?: string;
  children?: ReactNode;
};

type RowProps<T extends ElementType> = RowBase & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof RowBase | 'as'>;

export function Row<T extends ElementType = 'div'>(props: RowProps<T>) {
  const {
    as,
    density = 'comfortable',
    align = 'center',
    inset = 'none',
    interactive,
    leading,
    trailing,
    sx,
    className,
    children,
    ...rest
  } = props;
  const { className: sxClassName, style } = stylex.props(
    base.root,
    densities[density],
    aligns[align],
    interactive && base.interactive,
    insets[inset],
    sx,
  );
  const cls = className ? `${sxClassName} ${className}` : sxClassName;
  const slots = (
    <>
      {leading != null ? <div {...stylex.props(base.slotLeading)}>{leading}</div> : null}
      <div {...stylex.props(base.slotContent)}>{children}</div>
      {trailing != null ? <div {...stylex.props(base.slotTrailing)}>{trailing}</div> : null}
    </>
  );

  // interactive 로우는 항상 버튼 — Framer Motion으로 press 딤을 스프링 구동(TDS와 동일한 방식).
  if (interactive) {
    return (
      <motion.button
        type="button"
        initial={{ '--press-dim': 0 }}
        whileTap={{ '--press-dim': 1 }}
        transition={PRESS_DIM}
        {...(rest as unknown as HTMLMotionProps<'button'>)}
        className={cls}
        style={style}
      >
        {slots}
      </motion.button>
    );
  }

  const Tag = (as ?? 'div') as ElementType;
  const isButton = Tag === 'button';
  return (
    <Tag {...(isButton ? { type: 'button' } : null)} {...rest} className={cls} style={style}>
      {slots}
    </Tag>
  );
}
