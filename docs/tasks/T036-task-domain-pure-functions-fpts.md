# T036 — 태스크 비즈니스 로직 순수 함수 추출 + fp-ts 리팩토링 (TDD)

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-30
- 완료: 2026-07-30

## 배경

태스크 도메인의 핵심 비즈니스 로직이 트랜스포트/저장소 계층에 명령형으로 박혀 있고,
web·bff 양쪽에 중복돼 있어 한 곳을 고치면 다른 곳이 드리프트할 수 있다.

- **필드 단위 LWW 부분 업데이트** — "patch의 지정된(undefined 아닌) 필드만 적용하고
  version을 올린다"는 도메인 규칙이 세 곳에 각자 구현돼 있다:
  - `apps/bff/src/modules/task/adapters/memory.ts:172` — `if (patch.x !== undefined) record.x = ...` 명령형 뮤테이션
  - `apps/bff/src/modules/task/adapters/sql.ts:212` — Kysely `.set()` 스프레드 (DB 컬럼 매핑, 유지)
  - `apps/web/src/entities/task/patch.ts:12` — `applyTaskPatch` (이미 순수, fp-ts 미사용)
- **델타 동기화 커서 계산** — `apps/bff/src/modules/task/router.ts:90`에서
  `Math.max(input.cursor, ...seqs)`를 라우터 인라인으로 계산한다 (비즈니스 로직이 트랜스포트에 섞임).
- **프로젝트 진행률 집계** — `apps/bff/src/modules/task/router.ts:101`에서
  프로젝트 목록에 카운트(완료/전체)를 조인하는 로직을 라우터 인라인으로 수행한다.

`null`은 값 지정(프로젝트 해제)이고 `undefined`만 "미지정"이라는 미묘한 규칙이
각 구현에 흩어져 있어, 단일 순수 함수로 봉인할 가치가 크다.

## 작업 내용

TDD로 순수 함수부터 테스트를 쓰고, 그린이 되면 호출부를 순수 함수로 갈아끼운다.
함수 조합·`Option`은 fp-ts로 표현한다.

- 신설 `apps/bff/src/modules/task/domain.ts` (도메인 순수 함수, fp-ts):
  - `definedPatchFields(patch)` — `undefined`가 아닌 필드만 (`Record.filterMap` + 커스텀
    `fromDefined`로 `null`은 보존). LWW 적용 대상.
  - `applyPatch(task, patch)` — 지정 필드 적용 + `version + 1`.
  - `nextSyncCursor(cursor, ...changeLists)` — 커서와 모든 변경 seq의 최댓값 (`Array` + `max` monoid).
  - `attachProjectProgress(projects, counts)` — 프로젝트에 진행률(완료/전체) 조인
    (`Record` 조회 + `Option`으로 미집계 프로젝트는 0으로).
- `apps/bff/src/modules/task/adapters/memory.ts` `update` — `applyPatch`로 교체.
- `apps/bff/src/modules/task/router.ts` — `changes`는 `nextSyncCursor`, `projects`는
  `attachProjectProgress`로 교체 (라우터에서 비즈니스 로직 제거).
- SQL 어댑터 `update`는 부분 UPDATE문(스네이크 컬럼 + `completed_at` 파생)이라 도메인 함수로
  전부 대체 불가 — 의도적으로 SQL 표현 유지 (포트 계약 테스트가 memory와 동치를 보증).
- `apps/web/src/entities/task/patch.ts` — 같은 LWW 개념을 fp-ts(`Record.filterMap`)로 리팩토링.

기각한 대안:
- 순수 함수를 `packages/shared`에 두어 web·bff가 공유 — shared는 "계약(스키마)만"이라는
  컨벤션(README·web-entities)을 깨므로 기각. 각 슬라이스(bff task 모듈 / web entities)에
  둔다. 도메인 규칙은 valibot 스키마(`taskPatchSchema`)가 계약으로 이미 단일 선언돼 있다.

## 완료 기준

- [x] `apps/bff/src/modules/task/domain.test.ts` — 순수 함수 4종 테스트 (TDD, bun:test)
- [x] memory 어댑터·router가 도메인 함수를 사용
- [x] web `patch.ts` fp-ts 리팩토링 + `patch.test.ts` 통과
- [x] `bun test` (bff 111 pass), `bun run test` (web 24 pass) 그린
- [x] `bun run typecheck` 그린
- [x] `bun run check` (Biome) 그린
- [x] `bun run lint:deps` 그린 (경계 위반 없음)

## 대화 기록

> **사용자**: 여기서 tdd로 순수함수기반으로 비즈니스로직을 추출하고 fpts로 리팩토링햐봐

> **Claude**: 태스크 도메인의 핵심 비즈니스 로직(필드 단위 LWW 부분 업데이트, 델타
> 동기화 커서 계산, 프로젝트 진행률 집계)이 어댑터·라우터에 명령형으로 흩어져 있고
> web·bff에 중복돼 있음을 확인했다. 이를 순수 함수로 추출하고 fp-ts로 리팩토링하는
> 태스크(T036)로 착수한다. TDD로 도메인 순수 함수의 테스트를 먼저 쓰고, 그린이 되면
> 호출부(memory 어댑터·라우터·web patch)를 갈아끼운다.

## 작업 로그

- 2026-07-30: 태스크 착수. 코드베이스 조사 후 T036 문서 작성.
- 2026-07-30: TDD로 `domain.test.ts`(순수 함수 4종)를 먼저 써 red를 확인하고,
  `apps/bff/src/modules/task/domain.ts`를 구현해 green으로 만들었다 (fp-ts `Option`/`Array`/
  `Record`/`Ord`·`pipe`). memory 어댑터 `update`를 `applyPatch`로, router의 `changes`를
  `nextSyncCursor`·`projects`를 `attachProjectProgress`로 교체해 트랜스포트/저장소에서
  비즈니스 규칙을 걷어냈다. web `entities/task/patch.ts`도 같은 LWW 개념을 fp-ts로 리팩토링했다.
  fp-ts 2.16.11을 apps/bff·apps/web에 추가. 검증: bff `bun test` 111 pass·0 fail,
  web vitest 24 pass, `bun run typecheck`·`bun run check`·`bun run lint:deps` 모두 그린.
