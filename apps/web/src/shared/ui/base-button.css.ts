import { type RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { FOCUS_VISIBLE } from '@/styles/conditions';
import { baseRec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

// 베이스 버튼 — 리셋 + 인터랙션 계약(프레스·포커스 링·disabled)만. 색·크기·모양은
// 파생(Button의 tone/shape/size, 스와치·탭 등)이 recipes 레이어에서 얹는다 — base-recipe(여기)보다 위라 결정적으로 이긴다.
export const baseButton = recipe({
  base: baseRec({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    appearance: 'none',
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'inherit',
    fontFamily: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'left',
    minWidth: 0,
    // 색만 CSS로 트랜지션. press 축소(transform)는 Button이 Framer Motion 스프링으로 애니메이션한다.
    transition: `background-color ${vars.duration.fast} ${vars.easing.exit}, color ${vars.duration.fast} ${vars.easing.exit}`,
    selectors: {
      // _disabled는 aria-disabled까지 매칭하므로 네이티브 disabled에만 한정한다
      '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
      [FOCUS_VISIBLE]: { outline: 'none', boxShadow: vars.shadow.focus },
    },
  }),
  // variant 없음을 명시 — recipe가 Variants를 넓은 VariantGroups로 추론하지 않게 한다
  variants: {},
});

export type BaseButtonVariantProps = NonNullable<RecipeVariants<typeof baseButton>>;
