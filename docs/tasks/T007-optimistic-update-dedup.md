# T007 — 낙관적 업데이트 중복 제거 + 캐시 정책 컨벤션

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-08
- 커밋: -

## 배경

- `definedFields(patch: TaskPatch): Partial<Task>` 헬퍼가 doc 주석까지 byte 단위로
  동일하게 `features/today/today-screen.tsx`와 `features/tasks/task-detail-screen.tsx`에
  복붙되어 있다 (두 조사 에이전트가 독립적으로 발견). `onMutate`(cancel→snapshot→
  setQueryData) / `onError`(rollback) / `onSettled`(invalidate) 삼단 배선도 통째로 중복 —
  캐시 shape(`TaskRangeResponse.tasks[]` vs `{ task }`)만 다르다.
- 같은 코드베이스에 캐시 갱신 전략이 4가지 혼재: 낙관적+롤백+invalidate(task.update) /
  setQueryData prime(login·signup) / invalidate만(createProject) / navigate 후
  refetch(task.create). 언제 뭘 쓰는지 컨벤션이 없다.
- `task.delete`(task-detail-screen.tsx의 remove 뮤테이션)는 에러 처리가 아예 없다 —
  실패해도 아무 UI가 없음.
- queryKey 파생이 두 방식 혼용: `options.queryKey` vs `trpc.x.queryKey()`.

## 작업 내용

1. `definedFields` + 낙관적 패치 배선을 헬퍼로 추출 (T002 이후 자리는
   `entities/task/` 또는 `shared/` — 착수 시 결정).
2. 캐시 갱신 전략별 사용 기준을 컨벤션 문서(docs/conventions/)로 정리.
3. `task.delete`에 에러 표면화 추가 (다른 뮤테이션의 `isError → unexpected` 패턴).
4. queryKey 파생 방식을 한쪽으로 통일.

## 완료 기준

- [x] 낙관적 업데이트 로직의 복붙 0건
- [x] 캐시 정책 컨벤션 문서 + CLAUDE.md 인덱스 등록
- [x] task.delete 실패 시 사용자에게 보임
- [x] typecheck / web 테스트 통과

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> **5. 낙관적 업데이트 블록 복붙 + 캐시 정책이 뮤테이션마다 제각각**
> - `definedFields` 헬퍼가 doc 주석까지 byte 단위로 동일하게 `today-screen.tsx:61`과
>   `task-detail-screen.tsx:51`에 중복 (조사 에이전트 2개가 독립적으로 발견).
>   `onMutate`/`onError`/`onSettled` 삼단 배선도 통째로 복붙.
> - 캐시 갱신 전략이 4가지 혼재: 낙관적+롤백 / `setQueryData` prime / invalidate만 /
>   navigate 후 refetch. `task.delete`는 에러 처리가 아예 없음(`task-detail-screen.tsx:110`).
> - queryKey 파생도 두 방식 혼용(`options.queryKey` vs `trpc.x.queryKey()`).
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

---

> **사용자**: 7번테스크를 진행하자
>
> **Claude**: T007을 진행. 착수 시 결정 사항 — `definedFields`+version 증가는
> 태스크 도메인 매핑이라 `entities/task/patch.ts`(`applyTaskPatch`)로, onMutate/
> onError/onSettled 삼단 배선은 도메인 무관 React Query 유틸이라
> `shared/query.ts`(`optimisticPatch`)로 분리 추출 (web-entities.md의
> "entities에는 순수 모델·매핑만" 경계 유지). queryKey 파생은
> `trpc.<proc>.queryKey(input)`로 통일 — 키 파생 용도로 `queryOptions()`를
> 만들지 않는다. 캐시 갱신 전략 4가지의 선택 기준을
> docs/conventions/web-cache-policy.md로 문서화하고 CLAUDE.md 인덱스에 등록.
> task.delete는 `remove.isError → t.common.error.unexpected` danger Text로
> 에러 표면화.

## 작업 로그

- 낙관적 업데이트 중복 제거 + 캐시 정책 컨벤션 + delete 에러 표면화:
  - `apps/web/src/entities/task/patch.ts` 신설 — `applyTaskPatch(task, patch)`
    (내부 `definedFields`, version+1). 두 화면의 byte 단위 복붙 제거.
  - `apps/web/src/shared/query.ts` 신설 — `optimisticPatch(queryClient, queryKey, apply)`
    가 cancel→snapshot→패치 / 롤백 / invalidate 삼단을 배선. 캐시 shape는 콜백이 결정.
  - `today-screen.tsx`·`task-detail-screen.tsx`의 update 뮤테이션을 두 헬퍼 조합으로 교체.
  - `task-detail-screen.tsx` remove 뮤테이션에 `isError → t.common.error.unexpected` 표시 추가.
  - queryKey 파생 통일: `use-task-sync.ts`의 `queryOptions(range).queryKey` →
    `trpc.task.range.queryKey(range)`, 두 화면 뮤테이션도 `queryKey(input)` 파생.
  - `docs/conventions/web-cache-policy.md` 신설(전략 4가지 선택 기준·헬퍼 배선·
    에러 표면화·queryKey 파생) + CLAUDE.md 컨벤션 인덱스 등록.
  - 테스트 추가: `entities/task/patch.test.ts`(3), `shared/query.test.ts`(4).
  - 검증: `bun run typecheck` 통과(4 패키지), `apps/web bun run test` 12/12 통과,
    `bun run check`(Biome) 통과, `bun run lint:deps` 위반 0.
