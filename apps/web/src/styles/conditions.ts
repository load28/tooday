import type { StyleRule } from '@vanilla-extract/css';

// 인터랙션 상태 셀렉터를 한 곳에 모은다 — 각 recipe가 :hover/:active 조합을 제각기 쓰지 않게.
// hover는 포인터 기기 + 비활성 아님, press는 :active/data-pressed(비활성 제외), on은 Ark 토글 선택 상태.

type Selectors = NonNullable<StyleRule['selectors']>;
type Rule = StyleRule;

export const HOVER_MEDIA = '(hover: hover)';

/** @media (hover: hover) 안의 :not(:disabled):hover. base로 프리픽스를 합성한다(예: 토글 ON 위의 hover). */
export function hover(styles: Rule, base = '&'): Rule {
  return { '@media': { [HOVER_MEDIA]: { selectors: { [`${base}:not(:disabled):hover`]: styles } } } };
}

/** :active와 data-pressed(비활성 제외). selectors에 펼쳐 넣는다. */
export function press(styles: Rule, base = '&'): Selectors {
  return {
    [`${base}:not(:disabled):active`]: styles,
    [`${base}:not(:disabled)[data-pressed="true"]`]: styles,
  };
}

/** Ark ToggleGroup 등이 붙이는 선택 상태 data-state="on". */
export const ON = '&[data-state="on"]';

export const FOCUS_VISIBLE = '&:is(:focus-visible, [data-focus-visible])';
export const FOCUS = '&:is(:focus, [data-focus])';
export const DISABLED = '&:is(:disabled, [disabled], [data-disabled])';
export const PLACEHOLDER = '&::placeholder';
export const BEFORE = '&::before';
