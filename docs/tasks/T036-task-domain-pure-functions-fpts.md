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

> **사용자**: 지금 fpts쓰면서 as가 적용된곳이 있던데 as옶이 개선하고싶어

> **Claude**: `as`가 쓰인 곳은 `definedPatchFields`(bff)·`definedFields`(web)의 두 곳으로,
> 근본 원인은 fp-ts `R.filterMap`이 동종 `Record<string, A>`를 요구해 이종 구조체 `TaskPatch`를
> 넣을 때 입력·출력 양쪽 캐스팅을 강제한다는 점이다. 스크래치로 `as` 없이 컴파일되는 fp-ts
> 버전을 만들어 tsc 프로브로 검사해 보니, 그 버전의 추론 타입은 인덱스 시그니처를 가진
> `Record<string, string | number | null | undefined>`였다 — 즉 `as`만 사라졌을 뿐 값 타입을
> 오히려 더 넓혀(예: `status`에 `number` 대입도 통과) 불건전함을 그대로 숨긴다. 따라서 `as`
> 없이 진짜로 건전한 방법은 각 필드를 명시 복사해 컴파일러가 Task의 필드 타입으로 검증하게
> 하는 것뿐이라, `definedPatchFields`/`definedFields`를 명시 빌더로 바꿨다. 건전하게 fp-ts가
> 쓰이는 곳(`nextSyncCursor`·`attachProjectProgress`)은 그대로 뒀다. web은 이 파일이 유일한
> fp-ts 사용처였으므로 미사용이 된 fp-ts 의존성을 web 패키지에서 제거했다.

> **사용자**: 단순히 없애는게 아니라 정확히 추론되어야함

> **Claude**: 명시 빌더는 건전하나 반환 타입을 손으로 `Partial<Task>`로 넓혀 계약에서
> 파생된 정확한 타입이 아니었다. 조건부 스프레드(`...(cond ? { field } : {})`)로 바꾸면 각
> 조각이 정확히 추론돼(projectId의 `| null` 보존, status는 TaskStatus로 유지) 결과 타입도
> 계약에서 파생되고 `as`도 없다. tsc 프로브로 추론 타입에 인덱스 시그니처가 없음(정확)과
> projectId·status의 정밀도를 확인했다. 반환 타입을 계약에서 파생하는 `DefinedPatchFields`
> = `{ [K in keyof TaskPatch]?: Exclude<TaskPatch[K], undefined> }`로 명시하고, domain.test.ts에
> `Expect<Equal<…>>` 타입 수준 단언을 넣어 정밀도가 깨지면 `bun run typecheck`가 실패하도록
> 잠갔다(음성 테스트로 가드 동작 확인).

## 작업 로그

- 2026-07-30: 태스크 착수. 코드베이스 조사 후 T036 문서 작성.
- 2026-07-30: TDD로 `domain.test.ts`(순수 함수 4종)를 먼저 써 red를 확인하고,
  `apps/bff/src/modules/task/domain.ts`를 구현해 green으로 만들었다 (fp-ts `Option`/`Array`/
  `Record`/`Ord`·`pipe`). memory 어댑터 `update`를 `applyPatch`로, router의 `changes`를
  `nextSyncCursor`·`projects`를 `attachProjectProgress`로 교체해 트랜스포트/저장소에서
  비즈니스 규칙을 걷어냈다. web `entities/task/patch.ts`도 같은 LWW 개념을 fp-ts로 리팩토링했다.
  fp-ts 2.16.11을 apps/bff·apps/web에 추가. 검증: bff `bun test` 111 pass·0 fail,
  web vitest 24 pass, `bun run typecheck`·`bun run check`·`bun run lint:deps` 모두 그린.
- 2026-07-30: `definedPatchFields`(bff)·`definedFields`(web)의 `as` 두 곳을 제거했다.
  fp-ts `R.filterMap`이 이종 구조체에서 강제하던 캐스팅은 값 타입을 넓혀 불건전함을 숨길
  뿐이라(tsc 프로브로 확인), 두 헬퍼를 컴파일러가 필드별로 검증하는 명시 빌더로 교체했다.
  건전한 fp-ts 사용처(`nextSyncCursor`·`attachProjectProgress`)는 유지. web의 유일한 fp-ts
  사용처였으므로 web 패키지에서 fp-ts 의존성을 제거했다. 기존 `domain.test.ts`·`patch.test.ts`가
  동작 불변을 보증(bff 111 pass, web 24 pass), typecheck·check·lint:deps 그린.
- 2026-07-30: 명시 빌더의 반환 타입이 손으로 넓힌 `Partial<Task>`라 계약에서 파생된 정확한
  타입이 아니던 것을, 조건부 스프레드 + 계약 파생 타입 `DefinedPatchFields`
  (`{ [K in keyof TaskPatch]?: Exclude<TaskPatch[K], undefined> }`)로 바꿔 필드별 타입이
  정확히 추론되게 했다(projectId `| null` 보존, status는 TaskStatus 유지, `as` 없음).
  domain.test.ts에 `Expect<Equal<…>>` 타입 수준 단언을 추가해 정밀도 회귀를 typecheck가
  잡도록 잠갔다(음성 테스트로 가드 확인). bff 111 pass, web 24 pass, typecheck·check·lint:deps 그린.
