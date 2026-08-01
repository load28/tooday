import type { StyleRule } from '@vanilla-extract/css';

// Panda의 `@layer reset, base, tokens, recipes, utilities` 캐스케이드를 재현한다.
// 순서(우선순위)는 global.css 첫 줄의 `@layer reset, base, tokens, recipes, utilities;`가 확정한다.
// 여기서는 그 레이어 이름으로 규칙을 감싸기만 한다 — utilities가 recipes를 결정적으로 이긴다
// (docs/conventions/ui-styling.md).
const RECIPES_LAYER = 'recipes';
const UTILITIES_LAYER = 'utilities';

// 스타일 규칙을 지정 레이어로 감싼다. recipe/cva 각 leaf에 적용해 캐스케이드 순서를 고정한다.
// (Panda: config recipe → recipes 레이어, css()/cva() → utilities 레이어)
export const rec = (rule: StyleRule): StyleRule => ({ '@layer': { [RECIPES_LAYER]: rule } });
export const util = (rule: StyleRule): StyleRule => ({ '@layer': { [UTILITIES_LAYER]: rule } });
