import { defineRecipe } from '@pandacss/dev';

export const tabBarNav = defineRecipe({
  className: 'tabBarNav',
  base: { paddingBottom: 'md' },
});

export const tabBarInner = defineRecipe({
  className: 'tabBarInner',
  base: { display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', height: 'tabBar', paddingTop: 'md' },
});

export const tabBarItem = defineRecipe({
  className: 'tabBarItem',
  base: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2xs',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textStyle: 'micro',
    padding: 0,
    transition: 'color {durations.base} {easings.standard}',
    _focusVisible: { outline: 'none', boxShadow: 'focus' },
  },
  variants: {
    active: {
      true: { color: 'primary', fontWeight: 700 },
      false: { color: 'textTertiary' },
    },
  },
});

export const tabBarIconWrap = defineRecipe({
  className: 'tabBarIconWrap',
  base: {
    width: 'tapXl',
    height: '1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'pill',
    transition: 'background {durations.slow} {easings.standard}',
  },
  variants: {
    active: {
      true: { bg: 'primarySoft' },
      false: {},
    },
  },
});
