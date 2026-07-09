# T015 — 날짜 라벨 포맷 shared/time.ts로 집중화

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-09
- 커밋: 137f437

## 배경

`shared/time.ts`가 날짜·시간 유틸의 집인데, 표시용 라벨 포맷은 두 곳에서
`Intl.DateTimeFormat`을 인라인으로 쓴다:

- `features/today/week.ts:36-37` — `{ month: 'long', day: 'numeric', weekday: 'long' }`
- `features/tasks/task-detail-screen.tsx:85-89` — `{ month: 'long', day: 'numeric',
  weekday: 'short' }` + 수동 `new Date(\`${task.date}T00:00\`)` 파싱

옵션 객체가 거의 동일하게 중복되고, ISO 날짜 문자열 파싱도 손으로 한다.
(loader 고정 epoch에서 `new Date(now)`를 쓰는 SSR 패턴 자체는 일관되고 올바름.)

## 작업 내용

`shared/time.ts`에 locale 인자를 받는 날짜 라벨 포맷터(및 ISO 날짜 파서)를
추가하고 두 사용처를 이관한다.

## 완료 기준

- [ ] 표시용 Intl.DateTimeFormat 인라인 사용 0건
- [ ] typecheck / web 테스트 통과

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> 날짜 라벨 포맷 `Intl.DateTimeFormat`이 `shared/time.ts` 밖에서 2곳 인라인.
>
> (프론트 패턴 조사 에이전트 보고 원문):
>
> **8. Date-label formatting is inlined ad-hoc instead of using `shared/time.ts`** —
> `shared/time.ts` is the established home for date/time utilities, yet
> `Intl.DateTimeFormat` label building is done inline in two places with
> near-identical option objects:
> - `week.ts:36-37` — `{ month:'long', day:'numeric', weekday:'long' }`
> - `task-detail-screen.tsx:85-89` — `{ month:'long', day:'numeric', weekday:'short' }`,
>   plus the manual `` new Date(`${task.date}T00:00`) `` date-string parse.
>
> The parsing/formatting logic that `shared/time.ts` centralizes for ISO conversion is
> bypassed for display formatting. (Note: `new Date(now)` from a loader-fixed epoch is
> used consistently and correctly for SSR — that part is fine.)
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
