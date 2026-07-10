# T017 — 동기화 읽기 스냅샷 일관성 (영구 유실 버그)

- 상태: 대기
- 생성: 2026-07-10
- 완료: -
- 커밋: -

## 배경

동기화 시스템의 핵심 보장(커서가 진실, 기기 간 수렴)이 풀드 Postgres에서 깨질 수
있다. 두 읽기 경로 모두 여러 쿼리를 `Promise.all`로 **별도 커넥션·별도 스냅샷**에서
실행하면서 커서를 조합하기 때문이다. PGlite는 단일 커넥션이라 테스트에서는 절대
재현되지 않는다 — 프로덕션(pg 풀)에서만 드러나는 부류.

1. **`task.changes` 델타 풀** — `apps/bff/src/modules/task/router.ts:85-92`

   ```ts
   const [taskChanges, projectChanges] = await Promise.all([
     tasks.changesSince({ userId: ctx.userId, cursor: input.cursor }),
     projects.changesSince({ userId: ctx.userId, cursor: input.cursor }),
   ]);
   const maxSeq = Math.max(input.cursor, ...taskChanges.map(...), ...projectChanges.map(...));
   ```

   두 `changesSince`가 READ COMMITTED 스냅샷을 따로 잡는다. tasks 쿼리 후
   `task@seq1` 커밋 → `project@seq2` 커밋 → projects 쿼리가 `project@2`만 반환
   → 응답 커서가 2로 전진하면서 `task@1`은 그 행이 다시 변경되기 전까지
   **영구히 전달되지 않는다**.

2. **`task.range` 초기 로드 베이스라인** — `apps/bff/src/modules/task/router.ts:26-31`

   `listRange`·`listByUser`·`syncCursor`가 독립 스냅샷. `listRange` 스냅샷 이후
   `syncCursor` 읽기 이전에 윈도 내 태스크가 생성되면, 받지 못한 행보다 앞선
   커서가 베이스라인이 되어 이후 델타 스트림 전체가 오염된다.

3. **부수 발견 (같은 파일 정리 시 함께)**
   - `remove`(soft delete)가 `version`을 증가시키지 않는다 —
     `apps/bff/src/modules/task/adapters/sql.ts:237-250`. `update`는
     `version + 1` 하는데 tombstone만 예외라 "쓰기마다 증가" 불변식이 깨진다.
   - not-found인 `update`/`remove`도 `withUserSyncSeq`가 seq를 소모한다
     (`sql.ts:212-250`). 커서 의미상 무해(갭 허용)하지만 기록해 둔다 — 수정 불요.

## 작업 내용

- 두 읽기 경로를 각각 **단일 REPEATABLE READ 트랜잭션**(하나의 스냅샷)으로 묶는다.
  커서는 반환된 행들의 max가 아니라 같은 스냅샷 안에서 읽은 `sync_counters.seq`
  기준으로 도출한다 (커서 ≤ 데이터 스냅샷 보장).
- 포트 시그니처를 조정해 "범위+프로젝트+커서를 한 스냅샷에서" 읽는 연산을
  스토어가 소유하게 한다 (라우터에서 트랜잭션을 조립하지 않는다 — 헥사고날 경계 유지).
- `remove`에 `version` 증가 추가.
- 테스트: PGlite 단일 커넥션에서는 레이스가 재현되지 않으므로, 스토어에 주입
  가능한 심(쿼리 사이 훅)을 쓰거나 스냅샷 사용 여부를 구조적으로 검증하는
  테스트를 설계한다 (최소한 "커서는 counters에서 도출된다" 계약을 잠근다).

## 완료 기준

- [ ] `task.changes`가 단일 스냅샷에서 tasks+projects+커서를 읽는다
- [ ] `task.range`가 단일 스냅샷에서 데이터+커서를 읽는다
- [ ] `remove`가 `version`을 증가시킨다
- [ ] 회귀 테스트 추가, `bun run typecheck` / 기존 테스트 전체 통과

## 대화 기록

> **사용자**: 재조사를 하자 기존 14번 미처리로 결론을 내자
>
> **Claude** (BFF 조사 에이전트 보고 원문, 이 태스크 해당 부분):
>
> **H1 — Delta pull (`task.changes`) reads tasks and projects in separate
> snapshots → silent permanent data loss** [중략] The two `changesSince` queries
> run concurrently on **separate pool connections**, each with its own READ
> COMMITTED snapshot. A write that commits between the two snapshots can be
> excluded from this response, yet the returned `cursor` (max of what was seen)
> advances past it. [중략] Note it is invisible in tests because PGlite
> serializes on a single connection — only the pooled production Postgres
> exhibits it. Fix: run both `changesSince` in one REPEATABLE READ transaction
> (single snapshot), or derive the cursor from a `sync_counters` read taken
> inside that same snapshot rather than from the returned rows.
>
> **H2 — `task.range` reads snapshot data and the cursor without a shared
> snapshot → missed rows on initial load** [중략] This is the initial-load
> baseline, so a wrong cursor here poisons the whole subsequent delta stream
> for that device.
>
> **L14 — `remove` (soft delete) does not bump `version`, unlike every other
> write** [중략] The tombstone therefore carries a stale `version`, breaking
> the "monotonic per write" invariant a client might rely on.

## 작업 로그

- (없음)
