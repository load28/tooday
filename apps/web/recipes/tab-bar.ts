import { defineRecipe } from '@pandacss/dev';

export const tabBarNav = defineRecipe({
  className: 'tabBarNav',
  base: { paddingBottom: 'md' },
});

export const tabBarInner = defineRecipe({
  className: 'tabBarInner',
  base: { display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', height: 'tabBar', paddingTop: 'md' },
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
