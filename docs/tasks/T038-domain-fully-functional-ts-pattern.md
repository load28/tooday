# T038 — 도메인 분기를 전부 ts-pattern으로 통일 (함수형 스타일)

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-30
- 완료: 2026-07-30

## 배경

T037에서 도메인을 ts-pattern 단일 라이브러리로 옮겼으나, `definedPatchFields`의 필드
추출만 조건부 스프레드(삼항)로 남아 있었다. 삼항도 표현식이라 함수형이지만, 사용자가
"ts-pattern 하나로 함수형 스타일 통일"을 요청해 분기 표현을 ts-pattern `match`로 일관화한다.

- `apps/bff/src/modules/task/domain.ts:24` — `definedPatchFields`가 필드별 삼항 스프레드.

## 작업 내용

- `definedPatchFields` — 각 필드를 `match(value).with(undefined, () => ({})).otherwise(...)`로.
  `undefined`만 매칭해 빈 조각을, 그 외에는 그 필드 하나짜리 조각을 스프레드한다. `null`은
  literal `undefined`에 안 걸리므로 값으로 보존된다. 반환 타입 `DefinedPatchFields`(계약
  파생)는 유지 — 각 조각이 정확히 추론돼 `as` 없이 정밀도가 그대로다(스크래치 tsc 프로브로
  projectId `string | null` 보존·status `TaskStatus` 유지 확인).
- 나머지(`nextSyncCursor` reduce, `attachProjectProgress` map+match, `applyPatch` 스프레드)는
  이미 표현식·불변이라 유지.

기각한 대안:
- 필드 추출을 `match(value).with(P.nullish, …)`로 — `P.nullish`는 null까지 잡아 projectId 해제가
  깨지므로 기각. literal `undefined`만 매칭한다.
- 공통 헬퍼로 필드 조각 생성(`{ [key]: v }`) — 계산된 키가 타입을 뭉개(correlated union) `as`를
  부르므로 기각. 인라인 유지.

## 완료 기준

- [x] `definedPatchFields`가 ts-pattern `match`로 필드 추출
- [x] 반환 타입 정밀도 유지(`as` 없음), 동작 불변
- [x] `bun test`(bff 111 pass)·`bun run test`(web 24 pass)·typecheck·check·lint:deps 그린

## 대화 기록

> **사용자**: 티에스 파턴하나만 싸서 함수형으로 해봐

> **Claude**: fp-ts는 이미 제거돼 ts-pattern 하나만 남았고, 도메인은 대체로 함수형이다.
> 마지막으로 삼항 스프레드로 남아 있던 `definedPatchFields`의 필드 추출을 ts-pattern
> `match(value).with(undefined, …).otherwise(…)`로 통일한다. 스크래치 tsc 프로브로 이 방식이
> projectId의 `| null`과 status의 `TaskStatus`를 그대로 유지함(`as` 없이)을 확인하고 적용한다.

## 작업 로그

- 2026-07-30: 태스크 착수. 스크래치로 match-per-field가 정밀 타입을 유지함을 확인.
- 2026-07-30: `definedPatchFields`를 필드별 `match(v).with(undefined, …).otherwise(…)`로 통일.
  이제 도메인의 모든 분기가 ts-pattern이고 삼항/if가 없다. 정밀도·동작 불변(bff 111 pass,
  web 24 pass), typecheck·check·lint:deps 그린. 참고: Biome이 각 체인을 3줄로 감싸 삼항보다
  길어진다 — 함수형·단일 라이브러리 일관성과의 트레이드오프.
