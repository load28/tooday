import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { textStyles } from '@/styles/text-styles';
import { vars } from '@/styles/theme.css';

export const tabBarNav = recipe({
  base: rec({ paddingBottom: vars.space.md }),
});

export const tabBarInner = recipe({
  base: rec({
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: '1fr',
    height: vars.size.tabBar,
    paddingTop: vars.space.md,
  }),
});

export const tabBarIconWrap = recipe({
  base: rec({
    width: vars.size.tapXl,
    height: '1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: vars.radii.pill,
    transition: `background ${vars.duration.slow} ${vars.easing.standard}`,
  }),
  variants: {
    active: {
      true: rec({ background: vars.color.primarySoft }),
      false: rec({}),
    },
  },
});

export type TabBarIconWrapVariantProps = NonNullable<RecipeVariants<typeof tabBarIconWrap>>;

// 탭 고유 레이아웃·활성 색만 — 리셋·포커스 링은 BaseButton이 제공한다. (레이어 없는 오버레이 = cva → recipes를 덮는다)
export const tabBarItem = recipe({
  base: {
    flexDirection: 'column',
    gap: vars.space['2xs'],
    ...textStyles.micro,
    transition: `color ${vars.duration.base} ${vars.easing.standard}`,
  },
  variants: {
    active: {
      true: { color: vars.color.primary, fontWeight: 700 },
      false: { color: vars.color.textTertiary },
    },
  },
});
