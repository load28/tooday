import type { StyleRule } from '@vanilla-extract/css';

// 캐스케이드: reset(preflight) < base(globalCss) < recipes(디자인 시스템 recipe) < 레이어 없음(오버레이).
// 핵심: "레이어 없는 스타일은 어떤 레이어보다 이긴다" — recipe만 recipes 레이어에 두면, 그 위에 얹는
// cva·css·consumer className은 감싸지 않아도 자동으로 recipe를 덮는다(docs/conventions/ui-styling.md).
// 순서 선언은 __root.tsx <head>의 `@layer reset, base, recipes;` 한 줄이 확정한다.
// (VE globalLayer는 이 rolldown-vite + VE compiler 조합에서 fileScope 오류로 불안정해 문자열 레이어명을 쓴다.)
const RECIPES_LAYER = 'recipes';

// 디자인 시스템 recipe를 recipes 레이어에 넣는다 — 오버레이(레이어 없음)가 결정적으로 덮게 하는 유일한 배선.
export const rec = (rule: StyleRule): StyleRule => ({ '@layer': { [RECIPES_LAYER]: rule } });
