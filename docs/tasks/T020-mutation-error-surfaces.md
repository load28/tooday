# T020 — 낙관적 뮤테이션 에러 표면화 + 라우트 에러 경계

- 상태: 대기
- 생성: 2026-07-10
- 완료: -
- 커밋: -

## 배경

web-cache-policy.md의 "에러는 반드시 표면화한다" 컨벤션을 낙관적 `task.update`
뮤테이션 2곳이 위반한다. 삭제 버튼(`task-detail-screen.tsx:154`의
`remove.isError`)은 컨벤션대로인데 형제 코드가 누락 — 재조사(2026-07-10)에서
web·계약 조사 에이전트가 각각 독립적으로 최상위 문제로 지목했다.

1. **`features/today/today-screen.tsx:103-124`** — done 토글(`toggleTask`)의
   `updateTask`에 `isError` 표면 없음. 실패 시 체크박스가 조용히 롤백만 된다.
2. **`features/tasks/task-detail-screen.tsx:70-90`** — 상태/프로젝트/일정/제목
   인라인 편집의 `update`에 `isError` 표면 없음. 상세 화면의 모든 인라인 편집이
   무음 실패. 전역 `MutationCache.onError`/토스트 폴백도 없어 롤백이 유일한 효과.
3. **라우트 에러 경계 부재 + 죽은 `taskDetail.notFound`** — 어떤 라우트에도
   `errorComponent` 없음. 상세 화면들은 `useSuspenseQuery(trpc.task.byId...)`라
   삭제된/잘못된 id에서 쿼리가 throw해 경계 없이 버블링한다.
   `router.tsx`의 `defaultNotFoundComponent`는 라우트 미스만 잡고 쿼리 에러는
   못 잡는다. 의도된 UI용 문자열 `taskDetail.notFound`("태스크를 찾을 수 없어요",
   `schema.ts:100`/`ko.ts:101`)가 선언만 되고 배선된 적 없음.

## 작업 내용

- 두 낙관적 뮤테이션에 삭제 버튼 패턴대로 danger `Text` 표면 추가
  (`{update.isError ? <Text tone="danger">…</Text> : null}` — 공용 인라인 에러
  슬롯으로 추출할지 현장에서 판단).
- `_app/tasks/$taskId`·`_app/projects/$projectId`에 `errorComponent`(또는 쿼리
  에러 기반 not-found 분기)를 달아 `taskDetail.notFound`를 소비한다.
  projectDetail 쪽 메시지 필요 여부도 함께 확인.

## 완료 기준

- [ ] 모든 비폼 뮤테이션에 사용자 가시 실패 경로 존재 (컨벤션 충족)
- [ ] 삭제된 태스크/프로젝트 id 접근 시 not-found UI 표시
- [ ] `taskDetail.notFound` 죽은 키 해소 (배선됨)
- [ ] `bun run typecheck` / 기존 테스트 전체 통과

## 대화 기록

> **사용자**: 재조사를 하자 기존 14번 미처리로 결론을 내자
>
> **Claude** (web 조사 에이전트 보고 원문, 이 태스크 해당 부분):
>
> **1. Inline-edit mutations silently swallow errors — violates the documented
> "errors must be surfaced" convention** [중략] The delete button follows this
> (`task-detail-screen.tsx:154 remove.isError`), but the `task.update`
> optimistic mutations do **not** [중략] There is also no global
> `MutationCache.onError`/toast fallback, so rollback is the *only* effect.
> This is the strongest finding: the convention is explicit, and sibling code
> (delete) already does it the right way.
>
> **2. No `errorComponent` on any route + dead `taskDetail.notFound` string =
> unhandled query-error path** [중략] Tellingly, `schema.ts:100`/`ko.ts:101`
> define `taskDetail.notFound` but **it is never referenced** — the intended
> not-found UI was schema'd but never wired.

## 작업 로그

- (없음)
