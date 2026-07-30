# T037 — 태스크 도메인 매칭 로직을 ts-pattern으로 마이그레이션

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-30
- 완료: 2026-07-30

## 배경

T036에서 도메인 순수 함수를 fp-ts로 리팩토링했으나, 이후 논의에서 두 가지가 드러났다.

- **exhaustiveness를 더미로 검사**하고 있었다 — `domain.test.ts`의 `Expect<Equal<…>>`
  타입 수준 단언(`_TypeChecks`)은 `noUnusedLocals` 회피용 `export`까지 필요한 "검사용 더미"라
  가독성이 나쁘다. 사용자가 이 형태를 선호하지 않았다.
- 도메인의 fp-ts 사용은 얇다 — 실제 "매칭"은 `attachProjectProgress`의 값 있음/없음 분기
  한 곳뿐이고(`O.match`), `nextSyncCursor`는 매칭이 아니라 산술(`max` reduce)이다.

`ts-pattern`의 `match().with().exhaustive()`는 값에 대한 exhaustive 패턴 매칭을 1급으로
제공하므로, 매칭 로직을 여기에 얹으면 더미 없이 exhaustiveness를 표현할 수 있다.

## 작업 내용

라이브러리를 하나로 통일한다 — 매칭은 ts-pattern, 매칭이 아닌 자명한 연산은 순수 JS.

- `apps/bff/src/modules/task/domain.ts`:
  - `attachProjectProgress` — `Array.findFirst` + `O.match`를 `Array.find` +
    `match(count).with(P.nonNullable, …).with(P.nullish, …).exhaustive()`로. `.exhaustive()`가
    `ProjectTaskCounts | undefined`의 모든 경우가 처리됐음을 컴파일 타임에 보증한다.
  - `nextSyncCursor` — fp-ts `pipe/flatten/map/reduce/Ord`를 순수 `flat().reduce(Math.max, …)`로.
    (매칭이 아니므로 ts-pattern 대상이 아니다.)
  - `definedPatchFields`/`applyPatch` — 조건부 스프레드 유지(정확 추론·`as` 없음, T036 결정).
- `apps/bff/src/modules/task/domain.test.ts` — `Expect`/`Equal`/`_TypeChecks` 더미 제거.
  정밀도는 반환 타입 `DefinedPatchFields`(계약 파생) 애노테이션이 그대로 보증한다.
- fp-ts가 도메인의 유일한 사용처였으므로 `apps/bff`에서 fp-ts 의존성 제거, ts-pattern 추가.

기각한 대안:
- `status.ts`의 `Record<TaskStatus, Tone>` 톤 매핑을 ts-pattern `match(...).exhaustive()`로 전환 —
  `Record<Union, T>`가 이미 더미 없이 완전한 exhaustive 폼이고, match로 바꾸면 더 장황해지므로 기각.
- fp-ts 유지 + ts-pattern 병행 — 얇은 도메인에 라이브러리 둘은 과하므로 하나로 통일.

## 완료 기준

- [x] `attachProjectProgress`가 ts-pattern `.exhaustive()` 사용 (nullish 분기 제거 시 `TS2349`로 컴파일 실패 확인)
- [x] `nextSyncCursor` 순수 JS화(`flat().reduce(Math.max)`), fp-ts 제거
- [x] `_TypeChecks` 더미 제거
- [x] `apps/bff`에서 fp-ts 제거·ts-pattern@5.9.0 추가
- [x] `bun test`(bff 111 pass)·`bun run test`(web 24 pass) 그린 (기존 테스트가 동작 불변 보증)
- [x] `bun run typecheck`·`bun run check`·`bun run lint:deps` 그린

## 대화 기록

> **사용자**: (T036 완료 후) type Expect<T extends true> = T; … 이런 형태가 왜 필요한지 그리고
> 어떻게 이게 동작하는지 쉽게 알려달라

> **Claude**: (Expect/Equal 타입 테스트가 런타임 테스트로 못 잡는 "타입 정밀도"를 컴파일
> 타임에 잠그는 원리를 설명)

> **사용자**: 검사용 더미... 별로네 타입스크립트에선 결국 스위치를 타입으로 누락된 케이스처리가
> 불가능한가

> **Claude**: (유니온 "소비"는 `never`/`Record<Union,T>`로 더미 없이 exhaustive 가능함을 설명.
> 단 `definedPatchFields` 같은 "객체 생성"은 switch식 exhaustiveness가 안 붙는 게 TS의 한계.)

> **사용자**: ts pattern이 있던데 이걸써서 다시 마이그레이션해봐

> **Claude**: 매칭이 자연스러운 곳(`attachProjectProgress`)은 ts-pattern `.exhaustive()`로 옮기고,
> 매칭이 아닌 `nextSyncCursor`는 순수 JS로 걷어내 라이브러리를 ts-pattern 하나로 통일한다.
> 싫다고 한 `_TypeChecks` 더미도 제거한다. T037로 진행.

## 작업 로그

- 2026-07-30: 태스크 착수, ts-pattern@5.9.0 설치.
- 2026-07-30: `attachProjectProgress`를 `counts.find` + `match(...).with(P.nonNullable, …)
  .with(P.nullish, …).exhaustive()`로, `nextSyncCursor`를 `flat().reduce(Math.max, …)`로
  옮겼다. domain.test.ts의 `_TypeChecks`/`Expect`/`Equal` 더미 제거. bff에서 fp-ts 의존성
  제거. `.exhaustive()`가 실제로 무는지 nullish 분기를 빼 `TS2349`(호출 불가)로 컴파일
  실패함을 확인 후 복원했다. 검증: bff 111 pass·0 fail, web 24 pass, typecheck·check·lint:deps 그린.
