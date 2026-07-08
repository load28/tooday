# T016 — 소소한 통일 (캐스트 가드·내비게이션 API)

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
- 커밋: -

## 배경

- `features/projects/project-detail-screen.tsx:111` — Ark ToggleGroup 값
  `details.value[0] as TaskStatus | undefined` 무검증 캐스트. 값이 `STATUS_ORDER`
  출신이라 안전하지만, 병렬 사례(`task-fields.tsx:191`의 ScheduleSheet)는 캐스트
  없이 처리한다 — 가드/lookup으로 추론을 보존하는 게 type-safety.md 원칙.
- 내비게이션 API 혼용: auth 화면은 `useRouter().navigate`, 나머지는
  `useNavigate()`. 같은 일에 두 API. (뒤로가기는 `router.history.back()`으로
  일관 — 유지.)
- `today-screen.tsx` 안에서 `navigate(...)`와 `void navigate(...)` 혼용.

## 작업 내용

1. Ark value 캐스트를 가드(예: `STATUS_ORDER.find`) 기반으로.
2. 화면 내비게이션을 `useNavigate()` 한쪽으로 통일, `void` 처리 방침 통일.

## 완료 기준

- [ ] 무검증 `as` 캐스트 제거 (routeTree.gen 등 생성물 제외)
- [ ] 내비게이션 API 단일화
- [ ] typecheck / Biome 통과

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** — 이 항목은 조사 에이전트 보고에서 발견된 것으로, 보고 원문:
>
> (레이어링·타입 안전성 조사 에이전트):
>
> **6. Minor unchecked cast** — `apps/web/src/features/projects/project-detail-screen.tsx:111`
> — `const next = details.value[0] as TaskStatus | undefined`. The value originates
> from `STATUS_ORDER`, so it's safe, but it's an unvalidated cast of an Ark-UI string
> into a domain literal union where a lookup/guard would preserve inference. (The
> parallel `ScheduleSheet` in `task-fields.tsx:191` handles its Ark value via
> `Number(next)` instead of casting.)
>
> (프론트 패턴 조사 에이전트):
>
> **9. Two navigation APIs used for the same job**
> - Auth screens navigate post-mutation via `router.navigate({ to: '/today' })`
>   (`login-screen.tsx:58`, `signup-screen.tsx:59`), pulling `router` from `useRouter()`.
> - Every other screen navigates via `navigate(...)` from `useNavigate()`
>   (`new-task-screen.tsx:78`, `task-detail-screen.tsx:113`, etc.).
> - Back-navigation is consistently `router.history.back()` across `new-task`,
>   `task-detail`, `project-detail` — good.
> - Minor within-file inconsistency: `today-screen.tsx` uses bare
>   `navigate({ to: '/tasks/new' })` at line 145 but `void navigate(...)` at line 160.
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
