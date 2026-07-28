# T035 — 버튼·리스트 TDS식 hover/press (framer-motion)

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-28
- 완료: 2026-07-28

## 배경

T034에서 리스트/카드(Row·Card)는 state-layer 색으로 hover/press를 갖췄지만, **버튼**은
tone별 press 배경만 있고 **hover도, press 축소(모션)도 없다**. TDS를 JS까지 분석한 결과:

- TDS 버튼 press = **딤 색 + `scale(0.96)` 스프링**(모션 상태머신 initial↔pressed).
- TDS는 **hover와 press가 같은 목표 색**, 차이는 애니메이션 타이밍뿐(`whileHover:"hover"`,
  `touchDown`).
- 딤 색 산출 = `Color(자기색).setAlpha(명도 조건부 α)` — 여러 색 표면을 틴트하려는 것.
- **리스트 행은 축소 없이 색만**(ListRow "터치 이펙트").

우리 규칙: **버튼 = 축소 O, 리스트/카드 = 축소 X**(카드 축소는 가로폭 튐 — T034에서 제거함).

## 작업 내용 — 버튼·리스트를 TDS와 동일하게 (framer-motion)

TDS가 실제로 **Framer Motion**(JS `whileTap`)으로 press를 애니메이션하므로 CSS 근사가 아니라
**동일하게 `framer-motion@12.42.2` 도입**(정확 핀, React 19). (번들에 `whileTap`은 있으나
패키지명 문자열은 미니파이로 없어 "API=Framer Motion"은 확정, "이 npm 패키지 그 자체"는 미확정.)

**규칙**: 버튼 = press에 **scale 축소**(transform), 리스트/카드 = **축소 없이 딤(색)만**
(TDS ListRow와 동일). **hover 색은 버튼만**, **리스트는 hover 없음**(TDS ListRow는 hover 색이
없음 — 모바일 우선. 실측으로 확인).

- **버튼 `button.tsx`**: 일반 버튼은 `motion.button` + `whileTap={{scale:0.97}}` + spring.
  asChild(`<Link>`)는 Ark `BaseButton`(모션 없음). tone별 `_hover`=그 tone의 press 색(TDS식
  hover=press 색, press가 축소를 더함). raw `BaseButton`(리스트 내부)은 motion 안 타 축소 없음.
- **리스트 `card.tsx`·`row.tsx`**: interactive면 `motion.button` + `whileTap={{'--press-dim':1}}`
  + spring. 딤은 `::before` 오버레이(`bg: statePressed`, `opacity: var(--press-dim,0)`)를 motion이
  CSS 변수로 스프링 구동(색 보간 회피, TDS의 press-variant 딤과 동형). **scale 없음**.
- **`recipes/base-button.ts`**: transform을 CSS 트랜지션에서 제거(모션 소유), 미사용
  `pressed`(scale) variant 제거.
- **`recipes/card.ts`·`row.ts`**: `::before` 딤을 `opacity: var(--press-dim)`로, CSS `_press`/
  `_hover` 제거. Row엔 `position:relative` + `::before` 추가.
- **`panda.config.ts`**: `_hover` 조건을 **`['@media (hover: hover)', '&:not(:disabled):hover']`**
  배열로 override — 터치 잔상 방지(포인터 기기만) + **disabled에 hover 색 안 뜸**. (블록 문자열
  `{ &:hover }`는 `:hover`가 유실돼 항상 적용되는 버그 → 배열 중첩으로 교정.) `press` 조건도
  **`&:not(:disabled):active, &:not(:disabled)[data-pressed]`** 로 막아 **disabled 클릭 시 press 색
  안 뜸**(hover와 대칭). ⚠️ panda.config 조건 변경은 **dev 서버 재시작**이 필요할 수 있다(Vite
  Panda 플러그인이 config를 시작 시 로드).

**스코프 밖**: state-layer 기준색 near-black→중간 회색(TDS grey700)은 선택적 후속.

## 완료 기준

- [x] `Button` press 시 `scale≈0.97` 스프링 축소 후 복귀 (실측: press 중 `matrix(0.974)`, release `none`)
- [x] Card·Row press 시 딤 `::before` opacity를 motion이 구동(실측: `--press-dim`≈0.93, ::before
  opacity 따라감), **transform `none`**(축소 없음)
- [x] 버튼 hover 색 뜸(실측: 아이콘 버튼 rest 투명 → hover `state-hover`), 리스트는 hover 없음
- [x] **disabled 버튼 hover 시 색 안 뜸**(실측: disabled 로그인 버튼 hover=disabledSurface 유지)
- [x] 직접 tsc 통과, panda codegen 정상, 웹 테스트 24 passed, biome·depcruise 통과

## 대화 기록

> **Minyoung**: 버튼이랑 리스트 로우에 hover랑 pressed 애니메이션·컬러를 TDS 방식 그대로
> 차용해서 적용하고 싶다. 쉽게 설명해줘 → 진행해보자
>
> **Claude**: (TDS JS 분석) 버튼=딤색+scale 스프링, 리스트=색만. hover·press 같은 색.
> 우리: 버튼에 hover 색 + press 축소(스프링) 추가, 리스트는 T034 유지. T035로 착수.

> **Minyoung**: (반복 확인) tds는 진짜 이 라이브러리를 쓰나? / 동일하게 쓰고싶다 / 리스트
> 로우도 hover 컬러 넣나 tds도? / 똑같이하자 / 프레스도 tds와 같이 / 동일하게 맞추자
>
> **Claude**: JS에 `whileTap` 확인(=Framer Motion API, 패키지명은 미니파이로 미확정) →
> framer-motion 도입. 실측: **TDS ListRow는 hover 색이 없음**(hover해도 투명) → 리스트
> hover 제거, press만. "색엔 스프링이 무의미(=CSS와 동일)"라 설명했으나 방식 통일 위해 리스트
> press도 motion으로. 구현 중 disabled hover 색 버그·`_hover` 조건 오생성 버그를 실측으로
> 잡아 교정.

## 작업 로그

- 2026-07-28: 태스크 생성. 처음엔 CSS cubic-bezier 스프링으로 착수했으나, TDS가 실제로
  Framer Motion(`whileTap`)을 쓰는 걸 JS 분석으로 확인 → Minyoung 요청대로 **동일하게
  framer-motion 도입**으로 전환. CSS 스프링(easings.spring 토큰·baseButton transform·buttonStyle
  transform)은 걷어내고, `Button`을 `motion.button` + `whileTap` 스프링으로 배선. tone별 hover
  색·`@media(hover:hover)` 조건 추가. `motion.button`의 drag 핸들러 타입 충돌은 baseProps를
  `HTMLMotionProps`로 캐스팅해 해소. 검증: 직접 tsc 통과, 웹 테스트 24 passed, biome·depcruise
  통과, agent-browser 실측(버튼 press `matrix(0.974)`→복귀, 카드 축소 없음).
  참고: framer-motion은 정확 버전 핀(12.42.2). styled-system은 gitignored라 커밋 제외.
- 2026-07-28(후속): TDS ListRow 실측 결과 **hover 색 없음** 확인 → 리스트/카드 hover 제거
  (press만). "동일하게 맞추자" 지시로 리스트 press도 CSS→**framer-motion**으로 통일: Card·Row를
  `motion.button`으로, `::before` 딤 opacity를 `whileTap`이 `--press-dim`으로 스프링 구동.
  구현 중 실측으로 **두 버그 교정**: ① `_hover` 조건 블록 문자열이 `:hover` 유실→항상 적용(아이콘
  버튼·바텀시트 배경 상시) → 배열 중첩으로 수정, ② disabled 버튼 hover 색 뜸 → `:not(:disabled)`
  추가. 최종 실측: 버튼 scale press·hover(비활성 제외), 카드/Row 딤 motion press(축소 없음),
  disabled hover 없음 모두 확인. biome 포맷 정리 포함.
