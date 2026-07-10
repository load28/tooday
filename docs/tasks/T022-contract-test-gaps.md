# T022 — 계약·동기화 테스트 공백

- 상태: 대기
- 생성: 2026-07-10
- 완료: -
- 커밋: -

## 배경

재조사(2026-07-10)에서 확인된, 가장 드리프트되기 쉬운 이음새 두 곳이 테스트로
잠겨 있지 않다. (동시성 테스트는 해당 수정 태스크 T017/T018에 귀속 — 여기서는
계약 잠금만 다룬다.)

1. **`packages/shared`에 테스트 0개.** valibot 계약들 — auth 스키마, LWW
   `taskPatchSchema`의 "최소 한 필드" 체크(`task.ts:76-78`),
   `taskChangeSchema`/`projectChangeSchema`의 tombstone 형태, sync 커서 경계 —
   이 `apps/bff/src/app.test.ts`가 응답을 파싱하는 데서 간접적으로만 검증된다.
2. **web의 델타 적용기 `applyDelta` 무테스트** —
   `apps/web/src/features/today/use-task-sync.ts:78-97`. tombstone → 제거,
   윈도 밖 → 제거, `cursor: Math.max(...)` 전진이라는 동기화 계약의 가장
   드리프트되기 쉬운 소비자인데, `entities/task/patch.test.ts`(applyTaskPatch)와
   `shared/query.test.ts`(optimisticPatch)만 있고 이건 없다.

## 작업 내용

- `packages/shared/src`에 스키마 테스트 스위트 추가: 각 계약의 유효/무효 케이스,
  특히 `updateTaskRequestSchema` 비어있는 패치 거부, change 봉투(tombstone) 형태.
- `applyDelta`를 테스트 가능하게 (필요 시 순수 함수로 추출) tombstone·윈도 이탈·
  커서 전진 케이스를 단위 테스트로 잠근다.

## 완료 기준

- [ ] `packages/shared` 스키마 테스트 존재, 워크스페이스 테스트 파이프라인에 포함
- [ ] `applyDelta` 단위 테스트 (tombstone / 윈도 이탈 / 커서 전진)
- [ ] `bun run typecheck` / 전체 테스트 통과

## 대화 기록

> **사용자**: 재조사를 하자 기존 14번 미처리로 결론을 내자
>
> **Claude** (계약·타입 조사 에이전트 보고 원문, 이 태스크 해당 부분):
>
> **F9 — `packages/shared` has zero tests** [중략] The `updateTaskRequestSchema`
> non-empty-patch invariant and the change-envelope shape have no direct lock.
>
> **F10 — Web sync-delta reconstruction (`applyDelta`) is untested** [중략]
> this delta applier — the most drift-prone consumer of the sync contract —
> has no test.

## 작업 로그

- (없음)
