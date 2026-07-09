# T008 — 디자인 시스템 컨벤션 위반 2건 수정

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-09
- 커밋: (기입 예정)

## 배경

[ui-composition.md](../conventions/ui-composition.md)의 명시적 안티패턴에 해당하는
위반 2건 — 둘 다 올바른 패턴이 같은 코드베이스에 이미 존재한다.

1. **auth 링크** — `features/auth/login-screen.tsx:36-42`·`signup-screen.tsx:36-42`의
   `signupLinkCls`가 `BaseButton`의 포커스 링(`_focusVisible: { outline: 'none',
   boxShadow: 'focus' }`, `recipes/base-button.ts:27`과 동일)을 css()로 재구현한
   수제 인터랙티브 링크. tone/radius도 css()로 지정.
2. **WeekStrip** — `features/today/week-strip.tsx:58-79`가 단일 선택 그룹을 수동
   `aria-pressed={isActive}` + JS 조건부 recipe(`cellRecipe({ state: isActive ? … })`)로
   배선. "선택 상태 수동 배선 금지" + "상태 시각은 data-state(_on)로" 두 규칙 동시 위반.
   부수: `week-strip.tsx:33` 하드코딩 타이포(`fontSize: '16px', fontWeight: 700,
   lineHeight: '20px'` — textStyles 토큰 우회), `:46` raw `rgba(255,255,255,0.6)`
   (design-guide 프로토타입에서 복사된 값, 토큰 없음).

## 작업 내용

1. auth 링크 → `<Button asChild tone=… size=…><Link/></Button>` (자식 className은
   배치만 — ui-styling.md의 asChild 규칙).
2. WeekStrip → Ark `ToggleGroup` + `BaseButton` + 오버레이 `_on` 셀렉터로 전환.
   참조 구현: `project-detail-screen.tsx`의 상태 세그먼트, `shared/ui/color-swatch.tsx`.
3. WeekStrip의 하드코딩 타이포를 textStyles로, raw rgba는 토큰 추가 후 사용.

## 완료 기준

- [x] 수제 포커스 링·수동 선택 배선 0건 (두 화면 모두)
- [x] 키보드 내비게이션·aria가 Ark 제공으로 동작
- [x] typecheck / web 테스트 통과, 화면 동작 확인(/verify 스킬)

## 대화 기록

> **사용자**: 전체 디저인시스템의 아키텍처나 bff 설계 등등을 보고 체계적으로 잡힌게
> 아니라 예외적으로 만들어쟈있는부분을 찾아 개선하고싶음 먼저 찾아봐
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> **6. 디자인 시스템 컨벤션 직접 위반 2건** (ui-composition.md의 명시적 안티패턴)
> - **auth 링크**: `login-screen.tsx:36` / `signup-screen.tsx:36`이 `BaseButton`의
>   포커스 링(`boxShadow: 'focus'`)을 css()로 그대로 재구현한 수제 링크.
>   `<Button asChild>` 패턴으로 교체 대상.
> - **WeekStrip**: `week-strip.tsx:58-79`가 수동 `aria-pressed` + JS 조건부 recipe로
>   단일 선택을 배선. 같은 코드베이스의 `project-detail-screen.tsx:107`과
>   `color-swatch.tsx`가 이미 올바른 패턴(Ark ToggleGroup + `_on`)을 쓰고 있어서
>   따라가면 됩니다. 하드코딩 타이포(`fontSize: '16px'`, raw rgba — design-guide에서
>   복사된 값)도 함께.
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

---

(2026-07-09)

> **사용자**: 8번태스크가 뭔지 알려줘
>
> **Claude**: T008은 **"디자인 시스템 컨벤션 위반 2건 수정"** 태스크입니다 (우선순위
> 중간, 상태 대기 — 아직 착수 전). [중략 — 태스크 내용 요약 설명] 진행할까요?
>
> **사용자**: 네

## 작업 로그

- **auth 링크** (`login-screen.tsx`, `signup-screen.tsx`): 수제 `signupLinkCls`/`loginLinkCls`
  (BaseButton 포커스 링 재구현 + tone/radius css() 지정) 제거 →
  `<Button asChild tone="brandGhost" size="sm"><Link/></Button>`. 필요한 variant가 없어
  ui-styling.md 규칙대로 `Button`에 `brandGhost` tone(브랜드 텍스트 링크 룩:
  `color: textBrand`, press는 `primarySofter`)을 추가해서 사용. 링크가 버튼 패딩을 갖게 되어
  HStack gap은 `md` → `0`으로 보정.
- **WeekStrip** (`week-strip.tsx`): 수동 `aria-pressed` + JS 조건부 recipe
  (`state: active`) 배선 제거 → Ark `ToggleGroup.Root/Item` + `BaseButton`(asChild) +
  오버레이 `_on`(`background: primary, color: onPrimary`)으로 전환. 점(dot)의 활성 색은
  `[data-state="on"] &` 셀렉터로 처리. Ark가 단일 선택에 radiogroup/radio 시맨틱과
  roving focus를 자동 적용.
- **토큰화** (`panda.config.ts`): 하드코딩 타이포(`16px/700/20px` + tnum) →
  textStyle `numericLg` 신설, raw `rgba(255,255,255,0.6)` → 시맨틱 토큰
  `onPrimaryMuted` 신설 후 사용.
- **검증**: `bun run typecheck` 4/4 통과, web 테스트 12/12 통과, `biome check` 통과.
  /verify 스킬로 E2E 14/14 통과 — 링크 색·포커스 링·내비게이션, 가입 → /today,
  WeekStrip 7셀·선택 이동·재클릭 유지·ArrowRight+Enter 키보드 선택·radiogroup 시맨틱·
  날짜 타이포(16px/700/20px)·활성 배경(primary), `onPrimaryMuted` CSS 규칙 생성 확인.
