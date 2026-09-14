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
   `Button`을 쓴다** — tone/shape/size와 로딩 슬롯은 `button.tsx`가 소유한다. `TabBar`(탭 아이템),
   `ColorSwatchGroup.Item`(스와치), `TaskCard`(본문·체크)가 `BaseButton` 조립 방식이다.
3. **컴포넌트 고유 스타일 = 베이스 뒤에 병합하는 스타일 객체.** `BaseButton`은 자기
   `styles.root`를 먼저 깔고 `sx`를 뒤에 놓으므로, 파생 컴포넌트가 넘긴 스타일이
   **항상 결정적으로 이긴다**(ui-styling.md의 병합 규칙 참고). 레이어를 쓰지 않는다.

상태에 따라 바뀌는 시각 요소는 JS 조건부 렌더가 아니라 Ark가 붙이는
`data-state`로 처리한다 — 스타일 안에서 `:is([data-state="on"])` 조건을 쓴다.
그 상태가 **자손**에 반영돼야 하면 조상이 변수를 내려보내고 자손이 읽는다
(ui-styling.md의 「자손 스타일」). 예: `ColorSwatchGroup.Item`이
`swatch.indicatorOpacity`를 0↔1로 바꾸고 `Indicator`는 그 변수를 opacity로 읽는다.

**토글(선택) 동작이 필요한 버튼**은 선택 상태를 prop으로 수동 배선하지 않고
Ark `ToggleGroup`으로 감싼다. 룩에 따라 안에 넣는 것이 갈린다:

- 버튼 룩이면 `Button` — 선택 룩은 Button tone의 `ON`이 처리 (예: 시간 알약).
- 고유 룩이면 `BaseButton` + 오버레이의 `ON` (예: 색 스와치, 상태 세그먼트).

## 예 — ColorSwatchGroup

```tsx
// 상태·a11y: Ark ToggleGroup (단일 선택이면 radiogroup/radio 시맨틱 자동 적용)
<ToggleGroup.Item value={value} asChild>
  {/* 리셋·프레스·포커스 링: 베이스 버튼. 스와치 고유 스타일(치수·색)은 sx로 뒤에 병합돼 결정적으로 이긴다 */}
  <BaseButton sx={[styles.item, tones[tone]]}>{children}</BaseButton>
</ToggleGroup.Item>
```

## 안티패턴

- raw `<button>` + 인라인 style로 버튼을 처음부터 만들기 — 프레스·포커스·
  disabled 처리가 누락되고 룩이 흩어진다. 리셋(border/background/cursor 등)을
  스타일 객체에 손으로 다시 쓰는 것도 같은 안티패턴이다 — `BaseButton`을 조립한다.
- 버튼 룩이 필요한 자리에 `BaseButton` + 수제 tone/size 오버레이 — tone/shape/size는
  `Button`이 한 곳에서 소유한다. `<Button asChild>`나 variant prop으로 해결한다.
- 선택 상태를 `selected` prop으로 수동 배선 — Ark 프리미티브가 있으면 상태
  머신·키보드 내비게이션·aria까지 함께 온다.
- 베이스 스타일을 `sx`보다 뒤에 놓기 — `stylex.props(sx, styles.root)`처럼 순서를
  뒤집으면 사용처가 아무것도 못 덮는다. 항상 `props(베이스…, sx)` 순서를 지킨다.
