# T021 — 계약 단일 선언 잔여 (드리프트 가능 지점 봉인)

- 상태: 대기
- 생성: 2026-07-10
- 완료: -
- 커밋: -

## 배경

type-safety.md 컨벤션("한 곳에 선언, 파생으로 사용")을 지키지 않아 web↔bff가
조용히 어긋날 수 있는 지점들. 재조사(2026-07-10)에서 발견.

1. **`STATUS_ORDER` 재하드코딩** — `apps/web/src/entities/task/status.ts:4`
   `['todo','doing','done'] as const`. `packages/shared/src/task.ts:3`의
   `TASK_STATUSES`가 원본인데 타입이 `readonly TaskStatus[]`라 멤버 누락/중복/
   순서 변경이 컴파일을 통과한다.
2. **SSE 이벤트명 문자열 이중화** — BFF `apps/bff/src/app.ts:83,87,90`
   (`event: 'change'`, `'ping'`) vs web
   `apps/web/src/features/today/use-task-sync.ts:52`
   (`addEventListener('change', ...)`). 경로(`SYNC_EVENTS_PATH`)는 공유하면서
   이벤트명 절반은 맨 리터럴 — 서버가 이름을 바꾸면 클라이언트가 무음으로 수렴
   중단.
3. **BFF `update()`의 수동 필드→컬럼 매핑** —
   `apps/bff/src/modules/task/adapters/sql.ts:217-227`이 `TaskPatch` 필드를
   손으로 열거. web 쪽은 `entities/task/patch.ts`가 스키마에서 제네릭하게
   파생하므로, `taskPatchSchema`(`packages/shared/src/task.ts:64`)에 필드를
   추가하면 web 낙관 패치는 자동 반영되는데 서버는 조용히 무시 — 두 LWW
   적용기가 드리프트.
4. **`TaskRangeRequest` 인라인 재타이핑** —
   `apps/web/src/features/today/use-task-sync.ts:16,78`과
   `apps/bff/src/modules/task/ports.ts:19-25`가 `{from,to}`를 손으로 재선언.
   shared의 `TaskRangeRequest`(`task.ts:147`) 참조로 통일.
5. **web tsconfig의 `@bff/*` 딥임포트 알리아스 개방** —
   `apps/web/tsconfig.json`에 `"@bff/*": ["../bff/src/*"]`가 있는데
   dependency-cruiser에 web→bff 내부 차단 규칙이 없다. 현재 미사용이지만 계약
   (packages/shared + `AppRouter` 타입)을 우회할 수 있는 열린 문. 알리아스를
   제거하거나 depcruise forbidden 규칙 추가.
6. **(기록만) `row.project_id as string`** —
   `apps/bff/src/modules/task/adapters/sql.ts:175`. `where('project_id','is not',null)`
   를 Kysely가 내로잉 못해 기능상 정당하나, 정확성이 다른 곳의 where절에 묶인
   무검증 단언. 여유 있으면 타입드 헬퍼로.

## 작업 내용

- `STATUS_ORDER`를 `TASK_STATUSES` re-export/파생으로 교체.
- `SYNC_EVENT_CHANGE`(및 ping) 상수를 `packages/shared`에 추가, 양쪽 소비.
- `TaskPatch`→컬럼 매핑을 타입드 맵(`satisfies Record<keyof TaskPatch, ...>`)으로
  구동해 새 키 추가 시 컴파일 에러가 나게 한다.
- `{from,to}` 인라인 타입을 `TaskRangeRequest` 참조로 교체.
- `@bff/*` 알리아스 제거 (또는 depcruise 규칙 — 제거가 더 단순하면 제거).

## 완료 기준

- [ ] 위 5개 지점이 단일 선언에서 파생된다 (필드/이름 변경 시 컴파일 에러)
- [ ] `bun run typecheck` / `bun run lint:deps` / 기존 테스트 전체 통과

## 대화 기록

> **사용자**: 재조사를 하자 기존 14번 미처리로 결론을 내자
>
> **Claude** (계약·타입 조사 에이전트 보고 원문, 이 태스크 해당 부분):
>
> **F1 — `STATUS_ORDER` re-hardcodes the status list instead of deriving from
> `TASK_STATUSES`** [중략] a dropped/extra/reordered member compiles clean —
> the exact failure the convention exists to prevent.
>
> **F3 — SSE event names are hardcoded string literals on both sides** [중략]
> Rename the event server-side and the client silently stops converging — no
> compile error.
>
> **F4 — BFF `update()` hand-maps each `TaskPatch` field to a column with no
> exhaustiveness link** [중략] Adding a field to `taskPatchSchema` updates the
> web optimistic patch automatically but is silently ignored by the server
> writer — the two LWW appliers drift.
>
> **F2 / F5 / F7** [중략]

## 작업 로그

- (없음)
