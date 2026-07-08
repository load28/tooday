# T007 — 낙관적 업데이트 중복 제거 + 캐시 정책 컨벤션

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
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

- [ ] 낙관적 업데이트 로직의 복붙 0건
- [ ] 캐시 정책 컨벤션 문서 + CLAUDE.md 인덱스 등록
- [ ] task.delete 실패 시 사용자에게 보임
- [ ] typecheck / web 테스트 통과

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (조사 보고 중): "definedFields 헬퍼가 byte 단위 동일 복붙, 낙관적 업데이트
> 삼단 배선 통째로 중복, 캐시 정책 4가지 혼재, task.delete는 에러 처리 없음,
> queryKey 파생 두 방식 혼용."
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
