# UI 컴포넌트 조립 — 베이스 버튼 + Ark 프리미티브 + 슬롯 오버레이

## 규칙

새 인터랙티브 컴포넌트는 처음부터 만들지 않고 세 층을 조립한다
(Park UI 등 Ark 기반 디자인 시스템의 관례와 같다):

1. **동작·상태·접근성 = Ark UI 프리미티브.** 선택 상태, roving focus, aria
   배선은 직접 구현하지 않는다 — Dialog(BottomSheet), Field(Input),
   ToggleGroup(ColorSwatchGroup)처럼 해당 Ark 컴포넌트를 찾아 쓴다.
2. **클릭 가능한 엘리먼트 = 베이스 버튼(`BaseButton`) 재사용.** raw `<button>`을
   만들지 않는다 — Ark 파트가 버튼일 자리에는 `asChild`로 `BaseButton`을 병합한다.
   `BaseButton`은 리셋 + 인터랙션 계약(프레스 피드백·포커스 링·disabled·탭
   하이라이트)**만** 갖는다. 색·크기·모양은 없다. **버튼처럼 보여야 하면
   `Button`을 쓴다** — tone/shape/size(`button.css.ts`의 `buttonStyle` recipe)와
   로딩 슬롯은 `Button`이 소유한다. `TabBar`(탭 아이템),
   `ColorSwatchGroup.Item`(스와치), `TaskCard`(본문·체크)가 `BaseButton` 조립 방식이다.
3. **컴포넌트 고유 스타일 = 슬롯 오버레이(`rec()`로 감싼 recipe).** 베이스가
   `baseRec()`(base-recipe 레이어)인 이유가 바로 이것이다 — recipes 레이어의
   오버레이가 **항상 결정적으로 이기므로**(ui-styling.md 참고) 파생 컴포넌트가
   배경·색 등을 안전하게 덮을 수 있다. 오버레이끼리 겹치지 않게 슬롯당 하나만 둔다.

상태에 따라 바뀌는 시각 요소는 JS 조건부 렌더가 아니라 Ark가 붙이는
`data-state` 셀렉터로 처리한다 — `styles/conditions.ts`의 `ON`
(`&[data-state="on"]`)을 쓴다. 예: `ColorSwatchGroup.Indicator`는
`[data-state="on"] &`에서만 opacity 1이 된다.

**토글(선택) 동작이 필요한 버튼**은 선택 상태를 prop으로 수동 배선하지 않고
Ark `ToggleGroup`으로 감싼다. 룩에 따라 안에 넣는 것이 갈린다:

- 버튼 룩이면 `Button` — 선택 룩은 Button tone의 `ON`이 처리 (예: 시간 알약).
- 고유 룩이면 `BaseButton` + 오버레이의 `ON` (예: 색 스와치, 상태 세그먼트).

## 예 — ColorSwatchGroup

```tsx
// 상태·a11y: Ark ToggleGroup (단일 선택이면 radiogroup/radio 시맨틱 자동 적용)
<ToggleGroup.Item value={value} asChild>
  {/* 리셋·프레스·포커스 링: 베이스 버튼 */}
  <BaseButton className={swatchItem({ tone })}>
    {/* 스와치 고유 스타일(치수·색): recipes 레이어 오버레이 — baseButton(base-recipe 층)을 결정적으로 덮는다 */}
    {children}
  </BaseButton>
</ToggleGroup.Item>
```

## 안티패턴

- raw `<button>` + 인라인 style로 버튼을 처음부터 만들기 — 프레스·포커스·
  disabled 처리가 누락되고 룩이 흩어진다. 리셋(border/background/cursor 등)을
  recipe에 손으로 다시 쓰는 것도 같은 안티패턴이다 — `BaseButton`을 조립한다.
- 버튼 룩이 필요한 자리에 `BaseButton` + 수제 tone/size 오버레이 — tone/shape/size는
  `Button`이 한 곳에서 소유한다. `<Button asChild>`나 variant prop으로 해결한다.
- 선택 상태를 `selected` prop으로 수동 배선 — Ark 프리미티브가 있으면 상태
  머신·키보드 내비게이션·aria까지 함께 온다.
- 파생 컴포넌트 스타일을 `baseRec()`으로 감싸기 — 베이스와 같은 base-recipe
  레이어에 깔려 같은 속성의 승패가 레이어 내 생성 순서에 좌우된다.
  `baseRec`은 합성돼 덮이는 베이스(현재 `baseButton`) 전용이고, 오버레이는 `rec()`에 둔다.
