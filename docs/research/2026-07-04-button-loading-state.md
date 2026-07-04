# 기술조사: 버튼 로딩 상태를 디자인 시스템 레벨에서 제공하기

**배경**: 현재 `Pressable` 사용처가 로딩 표현을 직접 처리하고 있다.

```tsx
// apps/web/src/features/auth/login-screen.tsx
<Pressable type="submit" tone="brand" size="xl" disabled={!canSubmit || login.isPending}>
  {login.isPending ? '로그인 중…' : '로그인'}
</Pressable>
```

이 방식의 문제: (1) 사용처마다 로딩 표현이 제각각이 됨, (2) 텍스트 교체로 버튼 너비가 변해 레이아웃 시프트 발생, (3) `disabled`로 포커스가 유실되고 스크린리더 안내가 없음, (4) 중복 제출 방지가 사용처 책임.

**목표**: 로딩 상태를 디자인 시스템 레벨로 끌어올리되, 사용처에 표현의 다양성을 열어준다.

---

## 1. 주요 디자인 시스템 비교

| 시스템 | API | 라벨 처리 | 차단 방식 | 너비 보존 |
|---|---|---|---|---|
| **Chakra v3** | `loading` `loadingText` `spinner` `spinnerPlacement` | 기본: 숨김+중앙 스피너 / `loadingText` 시 교체 | 네이티브 `disabled` + `data-loading` | O (`visibility:hidden`으로 라벨 DOM 유지) |
| **MUI (v6.4+)** | `loading` `loadingIndicator` `loadingPosition` | `start`/`end` 유지, `center`(기본) 가림 | 네이티브 disabled | O (라벨 DOM 유지) |
| **Mantine** | `loading` `loaderProps` | 유지하되 오버레이로 가림 (`opacity:0` + translateY 애니메이션) | disabled + `data-loading` | O (오버레이) |
| **Ant Design** | `loading: boolean \| {delay, icon}` | 유지, 스피너 앞에 추가 | disabled 아님 — opacity + 내부 클릭 무시 | X |
| **shadcn/ui** | 내장 prop 없음 — `<Spinner/>` 컴포지션 | 유지, 스피너 추가 | 사용처가 `disabled` 직접 지정 | X |
| **React Aria (RAC)** | `isPending` | **유지** — `aria-labelledby` 합성으로 "Save, pending" | `aria-disabled` + 이벤트 차단, **포커스 유지** | O |
| **React Spectrum** | `isPending` | 시각적 대체(스피너 1초 지연 표시), 접근성 이름은 유지 | 이벤트 즉시 차단 | O |
| **Atlassian (신규)** | `isLoading` | **유지** — `opacity:0` 페이드 + 스피너 오버레이, name에 ", Loading" 합성 | 이벤트 캡처 차단, `aria-disabled`로 이행 중 | O |
| **Radix Themes** | `loading` | 스피너로 교체 (크기만 유지) | 네이티브 disabled | O |
| **Polaris** | `loading` | CSS로 숨기고 스피너 | 네이티브 disabled | O |
| **Carbon** | Button에 없음 — 별도 `InlineLoading` (`status: active/finished/error`) | 버튼을 InlineLoading으로 교체 | 연관 요소 disabled 권고 | — |
| **Ark UI / Zag, Radix Primitives, Base UI** | Button 프리미티브 없음 / 전용 prop 없음 | — | Base UI는 `disabled` + `focusableWhenDisabled` 권장 | — |

**관찰**: 스타일드 시스템은 예외 없이 `loading` boolean prop을 제공하고, 표현 개방은 slot prop(`spinner`, `loadingIndicator`, `loaderProps`) + 텍스트 옵션(`loadingText`) + 배치 옵션(`spinnerPlacement`/`loadingPosition`)의 3축으로 연다. 최신 접근성 지향 구현(React Aria, Atlassian 신규)은 네이티브 `disabled`를 버리고 이벤트 차단 + 포커스 유지로 수렴 중이다.

## 2. 접근성 결론

- **`disabled` 대신 `aria-disabled` + 이벤트 차단**: 방금 클릭한 버튼에 `disabled`를 걸면 포커스가 body로 튕긴다. `aria-disabled="true"`는 포커스를 유지하면서 SR에 비활성 상태를 전달한다. 클릭 차단은 핸들러 early-return(캡처 단계 차단)으로 하고, `type="submit"`은 로딩 중 암묵적 폼 제출도 막아야 한다(React Aria는 pending 중 `type="button"`으로 전환). 서버사이드 중복 방지 병행 권장(GOV.UK).
- **`aria-busy`는 쓰지 말 것**: 아무것도 announce하지 않으며(JAWS 외 대부분 무시), 일부 SR에서는 버튼 자식(라벨)을 아예 숨기는 부작용이 있다.
- **accessible name은 유지, 로딩 정보는 덧붙이기**: name을 "로그인"→"로딩 중"으로 통째로 바꾸면 announce가 비일관적이고 음성 제어 사용자가 버튼을 이름으로 부를 수 없게 된다. React Aria는 버튼 라벨 id + progressbar id를 `aria-labelledby`로 합성해 "저장, 대기 중"으로 읽게 한다. Atlassian은 name 뒤에 ", Loading"을 합성한다.
- **안내는 스피너의 `aria-label` + (필요시) live region**: 스피너에 `role="progressbar"`(또는 `role="status"`) + "로딩 중" 라벨을 부여한다. 스피너를 지연 표시하려면 `visibility:hidden`/`display:none`이 아니라 **`opacity:0`** — 접근성 트리에는 즉시 존재해야 한다(React Aria 명시 요건).

## 3. 레이아웃 시프트 방지

사실상 표준은 **"라벨을 공간 유지형으로 숨기고 스피너를 겹치기"**:

- **CSS grid stacking**(권장): 버튼(또는 내부 래퍼)을 `display:grid`로 만들고 라벨과 스피너를 같은 grid area에 겹친다. 영역 크기가 "가장 큰 자식" 기준이라 로딩 텍스트가 더 길어도 overflow가 없고, `position:relative` 래퍼가 필요 없다.
- absolute 오버레이 + 라벨 `opacity:0`(Mantine/Atlassian 방식)도 무방하나, 로딩 콘텐츠가 원래 라벨보다 크면 overflow.
- `min-width` 하드코딩은 i18n에 취약해 보조 수단으로만.
- 숨김은 `opacity:0`(접근성 트리 유지) — `visibility:hidden`은 트리에서 제거되므로 name 합성 전략과 충돌.

## 4. 커스터마이징 개방 패턴 (다양성 제공의 계층)

개방 수단은 표면적과 사용처 책임이 커지는 순으로 계층화된다:

1. **boolean prop + 좋은 기본값** — `loading` 하나로 스피너·차단·aria를 시스템이 전부 보증. 일관성 최대.
2. **slot prop** — `spinner={<MyLoader/>}`, `loadingText="저장 중…"`: 동작은 시스템이 소유하고 표현만 교체. (Nathan Curtis: "props는 configuration, slots는 composition")
3. **data-attribute 스타일 훅** — `data-loading`을 DOM에 노출하면 사용처가 CSS/recipe 어느 방식으로든 상태별 스타일 가능(Radix `data-state`, Mantine `data-loading` 방식). prop 폭발 방지.
4. **cva boolean variant** — Panda `cva`는 `variants: { loading: { true: {...} } }`를 지원하므로 스타일 분기를 recipe 차원에서 타입 안전하게 모델링 가능.
5. **render prop / compound component** — 완전 개방이지만 사용처가 a11y 계약을 스스로 지켜야 함. 사내 시스템 규모에서는 과잉.

즉 "다양성 제공"은 render prop까지 갈 필요 없이 **1+2+3 조합**이 Chakra/Mantine/Atlassian이 실제로 채택한 구성이다.

## 5. 권장 설계 (Pressable 기준)

```tsx
type PressableProps = PressableVariants & ... & {
  /** 로딩 상태. true면 클릭이 차단되고 스피너가 표시된다. */
  loading?: boolean;
  /** 로딩 중 라벨을 교체할 텍스트. 없으면 라벨 자리를 스피너가 덮는다(너비 유지). */
  loadingText?: ReactNode;
  /** 기본 스피너를 교체. */
  spinner?: ReactNode;
};
```

**동작 규칙 (시스템이 보증하는 부분)**

1. `loading=true`일 때:
   - 네이티브 `disabled`를 걸지 않는다. `aria-disabled="true"` + `data-loading` 속성 + onClick 무시(캡처 차단). `type="submit"`이면 로딩 중 submit 전파도 차단.
   - 라벨은 DOM에 유지한 채 `opacity:0`, 스피너는 grid stacking으로 같은 자리에 겹침 → 너비 보존 + 접근성 트리 유지.
   - 스피너에 `role="progressbar"` + `aria-label="로딩 중"`을 부여하고, 버튼의 accessible name은 라벨 + 스피너 라벨 합성(`aria-labelledby`)으로 "로그인, 로딩 중"이 되게 한다.
   - `aria-busy`는 사용하지 않는다.
2. `loadingText`가 있으면 스피너 + `loadingText` 조합으로 표시(Chakra 방식). 이때도 grid stacking이라 원래 라벨보다 길어도 시프트 없음.
3. 스타일 개방: cva에 `loading` boolean variant를 추가하고, 루트의 `data-loading`으로 사용처 CSS 오버라이드 허용.
4. `disabled`와 `loading`은 별개 prop — 로딩은 "잠시 기다림", disabled는 "불가"로 의미가 다르다.

**사용처는 이렇게 단순해진다**

```tsx
<Pressable type="submit" tone="brand" size="xl" loading={login.isPending} disabled={!canSubmit}>
  로그인
</Pressable>

// 다양성이 필요한 곳:
<Pressable loading={isPending} loadingText="저장 중…">저장</Pressable>
<Pressable loading={isPending} spinner={<Dots/>}>업로드</Pressable>
```

**선택 확장(당장은 불필요)**: `spinnerPlacement: 'start' | 'end'`(라벨 유지형), AntD식 `delay`(짧은 요청의 스피너 깜빡임 방지 — React Spectrum은 1초 지연 표시), Carbon식 성공/실패 상태 전이.

---

## 참고 소스

- Chakra UI Button — https://chakra-ui.com/docs/components/button
- MUI Button (loading) — https://mui.com/material-ui/react-button/#loading
- Mantine Button — https://mantine.dev/core/button/
- Ant Design Button — https://ant.design/components/button
- shadcn/ui Button/Spinner — https://ui.shadcn.com/docs/components/button
- React Aria Button (isPending) — https://react-aria.adobe.com/Button
- React Spectrum Button — https://react-spectrum.adobe.com/react-spectrum/Button.html
- Radix Themes Button — https://www.radix-ui.com/themes/docs/components/button
- Base UI Button — https://base-ui.com/react/components/button
- Polaris Button — https://polaris-react.shopify.com/components/actions/button
- Carbon InlineLoading — https://carbondesignsystem.com/components/inline-loading/usage/
- Atlassian Button — https://atlassian.design/components/button
- Adrian Roselli, "Don't Disable Form Controls" — https://adrianroselli.com/2024/02/dont-disable-form-controls.html
- Adrian Roselli, "Be Careful with Dynamic Accessible Names" — https://adrianroselli.com/2020/12/be-careful-with-dynamic-accessible-names.html
- CSS-Tricks, "Making Disabled Buttons More Inclusive" — https://css-tricks.com/making-disabled-buttons-more-inclusive/
- Sara Soueidan, "Accessible Notifications with ARIA Live Regions" — https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/
- Bekk, "Accessible loading button" — https://www.bekk.christmas/post/2023/24/accessible-loading-button
- GOV.UK Design System Button — https://design-system.service.gov.uk/components/button/
- Hubert Sablonnière, "Prevent layout shifts with CSS grid stacks" — https://www.hsablonniere.com/prevent-layout-shifts-with-css-grid-stacks--qcj5jo/
- Nathan Curtis, "Slots in Design Systems" — https://nathanacurtis.substack.com/p/slots-in-design-systems
- components.build, "Data Attributes" — https://www.components.build/data-attributes
- Panda CSS Recipes — https://panda-css.com/docs/concepts/recipes
