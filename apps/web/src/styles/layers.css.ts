import type { StyleRule } from '@vanilla-extract/css';

// 캐스케이드: reset(preflight) < base(globalCss) < base-recipe(합성 베이스) < recipes(컴포넌트 recipe) < 레이어 없음(1회성 css).
// - baseButton처럼 다른 recipe에 cx로 덮이는 베이스는 base-recipe 레이어(rec보다 아래)에 둔다 → 컴포넌트 recipe가 이긴다.
// - 나머지 모든 recipe(card·text·buttonStyle·…)는 recipes 레이어.
// - heroCls 같은 1회성 style()은 레이어 없이 둔다 → "레이어 없는 스타일이 어떤 레이어보다 이긴다"로 recipe를 덮는다.
// 순서 선언은 __root.tsx <head>의 `@layer reset, base, base-recipe, recipes;` 한 줄이 확정한다.
// (VE globalLayer는 이 rolldown-vite + VE compiler 조합에서 fileScope 오류로 불안정해 문자열 레이어명을 쓴다.)
const BASE_RECIPE_LAYER = 'base-recipe';
const RECIPES_LAYER = 'recipes';

// 합성돼 덮이는 베이스 recipe(현재 baseButton 하나)를 base-recipe 레이어에 넣는다.
export const baseRec = (rule: StyleRule): StyleRule => ({ '@layer': { [BASE_RECIPE_LAYER]: rule } });
// 컴포넌트 recipe를 recipes 레이어에 넣는다.
export const rec = (rule: StyleRule): StyleRule => ({ '@layer': { [RECIPES_LAYER]: rule } });
