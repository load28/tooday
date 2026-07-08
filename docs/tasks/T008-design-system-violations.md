# T008 — 디자인 시스템 컨벤션 위반 2건 수정

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
- 커밋: -

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

- [ ] 수제 포커스 링·수동 선택 배선 0건 (두 화면 모두)
- [ ] 키보드 내비게이션·aria가 Ark 제공으로 동작
- [ ] typecheck / web 테스트 통과, 화면 동작 확인(/verify 스킬)

## 대화 기록

> **사용자**: 전체 디저인시스템의 아키텍처나 bff 설계 등등을 보고 체계적으로 잡힌게
> 아니라 예외적으로 만들어쟈있는부분을 찾아 개선하고싶음 먼저 찾아봐
>
> **Claude** (조사 보고 중): "가장 논쟁의 여지가 없는 위반은 auth 링크(포커스 링
> 재구현)와 WeekStrip(수동 선택 배선) — 둘 다 ui-composition.md의 명시적 안티패턴에
> 정면으로 해당하고, 올바른 패턴이 같은 코드베이스에 이미 있음."
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
