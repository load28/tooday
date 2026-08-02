import { style } from '@vanilla-extract/css';
import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { FOCUS_VISIBLE } from '@/styles/conditions';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

// 패딩은 Card의 padding variant로 준다 — 여기서 padding을 덮으면 recipe 기본값(p_0)과 충돌한다
export const cardCls = style({ display: 'flex', alignItems: 'flex-start', gap: vars.space.xl });

// 리셋·포커스 링은 BaseButton이 제공 — 여기는 본문 레이아웃만 얹는다.
export const bodyCls = style({
  flex: 1,
  minWidth: 0,
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: vars.space.sm,
  selectors: { [FOCUS_VISIBLE]: { borderRadius: vars.radii.xs } },
});

export const checkRecipe = recipe({
  base: rec({
    width: vars.size['4xl'],
    height: vars.size['4xl'],
    borderRadius: vars.radii.sm,
    border: `1.5px solid ${vars.color.borderStrong}`,
    background: vars.color.surface,
    flex: '0 0 auto',
    transition: `all ${vars.duration.base} ${vars.easing.standard}`,
  }),
  variants: {
    status: {
      todo: rec({}),
      doing: rec({ background: vars.color.primarySoft, borderColor: vars.color.primary, color: vars.color.primary }),
      done: rec({ background: vars.color.success, borderColor: vars.color.success, color: vars.color.textInverse }),
    },
  },
});

export type CheckRecipeVariantProps = NonNullable<RecipeVariants<typeof checkRecipe>>;
