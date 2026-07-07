# UI 컴포넌트 조립 — 베이스 버튼 + Ark 프리미티브 + 슬롯 오버레이

## 규칙

새 인터랙티브 컴포넌트는 처음부터 만들지 않고 세 층을 조립한다
(Park UI 등 Panda+Ark 디자인 시스템의 관례와 같다):

1. **동작·상태·접근성 = Ark UI 프리미티브.** 선택 상태, roving focus, aria
   배선은 직접 구현하지 않는다 — Dialog(BottomSheet), Field(Input),
   ToggleGroup(ColorSwatchGroup)처럼 해당 Ark 컴포넌트를 찾아 쓴다.
2. **클릭 가능한 엘리먼트 = 베이스 버튼(`Pressable`) 재사용.** Ark 파트가
   버튼일 자리에는 `asChild`로 `Pressable`을 병합한다. 프레스 피드백·포커스
   링·disabled·탭 하이라이트를 공짜로 얻고, 버튼 계열의 룩이 한 곳에 모인다.
   `Button`(로딩 슬롯), `ColorSwatchGroup.Item`(스와치)이 이 방식이다.
3. **컴포넌트 고유 스타일 = 슬롯 오버레이(cva/css, utilities 층).** 베이스
   recipe가 config recipe(`@layer recipes`)인 이유가 바로 이것이다 — utilities
   층의 오버레이가 **항상 결정적으로 이기므로**(ui-styling.md 참고) 파생
   컴포넌트가 배경·색 등을 안전하게 덮을 수 있다. 오버레이끼리 겹치지 않게
   슬롯당 하나만 둔다.

상태에 따라 바뀌는 시각 요소는 JS 조건부 렌더가 아니라 Ark가 붙이는
`data-state` 셀렉터로 처리한다 — 예: `ColorSwatchGroup.Indicator`는
`[data-state="on"] &`에서만 opacity 1이 된다.

## 예 — ColorSwatchGroup

```tsx
// 상태·a11y: Ark ToggleGroup (단일 선택이면 radiogroup/radio 시맨틱 자동 적용)
<ToggleGroup.Item value={value} asChild>
  {/* 버튼 룩·동작: 베이스 버튼 */}
  <Pressable shape="circle" size="icon" className={swatchItem({ tone })}>
    {/* 스와치 고유 스타일: cva 오버레이(utilities) — pressable(recipes 층)을 결정적으로 덮는다 */}
    {children}
  </Pressable>
</ToggleGroup.Item>
```

## 안티패턴

- raw `<button>` + 인라인 style로 버튼을 처음부터 만들기 — 프레스·포커스·
  disabled 처리가 누락되고 룩이 흩어진다.
- 선택 상태를 `selected` prop으로 수동 배선 — Ark 프리미티브가 있으면 상태
  머신·키보드 내비게이션·aria까지 함께 온다.
- 파생 컴포넌트 스타일을 별도 config recipe로 추가 — 베이스 recipe와 같은
  `@layer recipes`에 깔려 같은 속성의 승패가 레이어 내 생성 순서에 좌우된다.
  오버레이는 utilities(cva/css)에 둔다.
