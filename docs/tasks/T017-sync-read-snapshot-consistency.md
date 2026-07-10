# T017 — 동기화 읽기 스냅샷 일관성 (영구 유실 버그)

- 상태: 완료
- 생성: 2026-07-10
- 완료: 2026-07-10
- 커밋: 56314f9

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

- [x] `task.changes`가 단일 스냅샷에서 tasks+projects+커서를 읽는다
- [x] `task.range`가 단일 스냅샷에서 데이터+커서를 읽는다
- [x] `remove`가 `version`을 증가시킨다
- [x] 회귀 테스트 추가, `bun run typecheck` / 기존 테스트 전체 통과

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

### 2026-07-10 — 검토·착수 대화

> **사용자**: 저장된 하나의 태스크를 알려달라. 어떤 내용인지 검토부터 하자
>
> **Claude**: 대기 중인 태스크 8건 가운데 우선순위 「높음」인 T017을 골라 내용을
> 검토했습니다. 태스크 문서가 지목한 코드 위치도 실제로 확인해서 주장과
> 대조했습니다. [태스크가 주장하는 문제 3건 요약: ① `task.changes`의
> `Promise.all` + max 커서 조합으로 인한 영구 유실, ② `task.range` 초기 로드
> 베이스라인 오염, ③ `remove`의 version 미증가] 코드 대조 결과 — 세 가지 지적
> 모두 현재 코드와 정확히 일치합니다. `router.ts:86-91`의 `Promise.all` +
> `Math.max` 커서 조합, `router.ts:26-30`의 3중 병렬 읽기, `sql.ts:242`에서
> `update`와 달리 `version` 증가가 빠진 것까지 그대로입니다. [중략] 진단이
> 정확하고 수정 방향도 아키텍처 컨벤션(포트가 트랜잭션 소유)에 맞게 잡혀 있어서
> 문서 그대로 진행해도 무리가 없어 보입니다.
>
> **사용자**: 음 이해가 안가네 더 이해하기 쉽게 설명을 해달라
>
> **Claude**: [동기화 원리 설명: 모든 변경에 일련번호(seq), 기기는 "몇 번까지
> 받았어" 커서 보유. 성립 조건은 단 하나 — "커서가 N이면 N번 이하 변경은 전부
> 전달됐다"] 문제: 서버가 두 번 나눠서 읽는다 — 델타를 내려주는 `task.changes`는
> 두 개의 쿼리를 동시에 던지는데, 프로덕션 Postgres는 커넥션 풀을 쓰기 때문에 이
> 두 쿼리가 서로 다른 커넥션에서 실행되고 각자 서로 다른 순간의 데이터베이스를
> 봅니다. [타임라인: ① 태스크 쿼리 실행 → ② 다른 기기가 태스크 수정(seq 5) →
> ③ 프로젝트 수정(seq 6) → ④ 프로젝트 쿼리 실행] 응답에 담긴 건 프로젝트
> 변경(seq 6)뿐인데 커서는 "본 것들 중 최댓값"인 6이 됩니다. 기기는 다음에
> "7번부터 주세요"라고 하죠. seq 5짜리 태스크 변경은 영영 안 내려옵니다. 에러도
> 안 나고 조용히 어긋나는 게 이 버그의 고약한 점입니다. [중략] 고치는 방법을 한
> 문장으로: 여러 번 나눠 읽던 걸 한 장의 사진으로 바꾼다 — 관련 쿼리들을 하나의
> 트랜잭션(REPEATABLE READ)으로 묶고, 커서도 같은 사진 안에서 카운터 테이블
> (`sync_counters`)을 직접 읽어 정합니다.
>
> **사용자**: 좋아 진행하자
>
> **Claude**: [구현 진행 — 작업 로그 참조. 완료 기준 4건 전부 충족, 커밋 56314f9]

## 작업 로그

- **56314f9** — 동기화 읽기 단일 스냅샷화 + tombstone version 증가
  - `SyncReadStore` 포트 신설 (`modules/task/ports.ts`): `range`/`changes`가
    데이터+커서를 한 스냅샷에서 읽는 연산을 통째로 소유. 조합 가능한 낱개 읽기
    (`listRange`·`changesSince`·`syncCursor`)는 포트에서 제거해 라우터가 다시
    조합하는 구멍을 봉인 (헥사고날 경계 유지 — 트랜잭션 조립은 어댑터 소관).
  - `SqlSyncReadStore`: REPEATABLE READ 트랜잭션 하나에서 counters → 데이터 순으로
    읽고 커서를 `sync_counters.seq`에서 도출. 쓰기가 advisory lock으로 직렬화되어
    seq 발급 순서 = 커밋 순서이므로 "스냅샷의 counters.seq = N ⇒ seq ≤ N 변경 전부
    가시"가 성립 — 커서 ≤ 데이터 스냅샷 보장. 낱개 SELECT는 모듈 함수로 추출해
    스토어 메서드(`listByUser`)와 스냅샷 트랜잭션이 공유.
  - `InMemorySyncReadStore`: 데이터+커서를 동기 블록 하나에서 계산 (SQL의 단일
    스냅샷에 대응). 메모리 스토어의 낱개 읽기는 동기 메서드로 전환.
  - `SqlTaskStore.remove`에 `version + 1` 추가 (memory 구현은 이미 증가하고 있었음
    — 어댑터 간 불일치이기도 했다).
  - 라우터 `range`/`changes`는 `syncReads` 위임으로 축소, `AppDeps`/`AppRouterDeps`/
    `TaskRouterDeps`에 `syncReads` 배선 (`index.ts`는 `SqlSyncReadStore`,
    `app.test.ts`는 `InMemorySyncReadStore`).
  - 회귀 테스트 (`adapters.test.ts`): ① 커서-counters 도출 계약 — not-found
    `remove`가 seq를 소모해 갭을 만들면 행-max 도출(1)과 counters 도출(2)이
    구별된다, SQL 전용 (memory는 not-found에 seq를 소모하지 않음). 스냅샷 레이스
    자체는 단일 커넥션 PGlite로 재현 불가 — 태스크 문서의 예상대로 계약 잠금으로
    대체. ② tombstone `version: 2` 단언. 기존 계약 테스트는 `syncReads` 경유로 이관.
  - 검증: `bun run typecheck` 4패키지 통과, `biome lint`/`check`/`lint:deps` 클린,
    BFF `bun test src` 96 pass / 0 fail (종료 코드 99는 변경 전 baseline에서도
    동일한 기존 현상, design-guide 테스트의 Vite 종료 타임아웃 실패도 본 변경과
    무관 — 해당 패키지 파일 변경 없음).
