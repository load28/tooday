# T004 — version 필드의 삼자 모순 정리

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
- 커밋: -

## 배경

`Task.version` 필드에 대해 문서 3곳이 서로 다른 말을 한다:

- `packages/shared/src/task.ts:28` 주석 — **낙관적 잠금**: "쓰기 요청은 읽은 시점의
  version을 함께 보내고, 서버는 일치할 때만 반영한다"
- `apps/bff/src/platform/db/schema.ts:57` 주석 — "행 변경 카운터 (캐시 검증·디버깅용)"
- 실제 코드 `apps/bff/src/modules/task/adapters/sql.ts` `update` — 비교 없이 무조건
  `version + 1`. `updateTaskRequestSchema`는 version을 받지도 않는다.

README의 동기화 모델("필드 단위 LWW — 409 없음")과 shared 계약 주석이 정면 충돌.
태스크 공유 기능(docs/task-sharing-architecture.md)을 얹기 전에 반드시 정리해야
하는 모순이다.

## 작업 내용

기본 방향: README의 LWW 모델이 진실이므로 `packages/shared/src/task.ts`의 주석을
실제 동작(LWW 변경 카운터)에 맞게 고치고, `schema.ts` 주석과 표현을 통일한다.
낙관적 잠금이 실제로 필요하다는 판단이면 그때 별도 태스크로 설계한다(스키마에
version 추가 + 서버 비교 + 클라이언트 409 처리 — 범위가 큼).

## 완료 기준

- [ ] version의 의미가 계약 주석·DB 스키마 주석·코드·README 네 곳에서 일치
- [ ] typecheck / bff 테스트 통과

## 대화 기록

> **사용자**: 전체 디저인시스템의 아키텍처나 bff 설계 등등을 보고 체계적으로 잡힌게
> 아니라 예외적으로 만들어쟈있는부분을 찾아 개선하고싶음 먼저 찾아봐
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> **3. `version` 필드 — 문서 3곳이 서로 모순, 실제 구현은 그 어느 쪽도 아님**
> - `packages/shared/src/task.ts:28` 주석: "낙관적 잠금 — 서버는 일치할 때만 반영" ← 확인함
> - `platform/db/schema.ts:57` 주석: "행 변경 카운터 (캐시 검증·디버깅용)"
> - 실제 코드(`task/adapters/sql.ts:224`): 비교 없이 무조건 `version + 1`, update 요청
>   스키마에 version 자체가 없음
> - README의 "필드 단위 LWW — 409 없음" 모델과 shared 계약 주석이 정면 충돌합니다.
>   주석을 실제 동작(LWW 변경 카운터)에 맞추거나, 낙관적 잠금을 구현하거나 — 하나로
>   정리 필요.
>
> [중략 — 추천 착수 순서]
>
> 2. **`version` 의미 통일** — 문서·계약·코드 삼자 모순은 나중에 동기화 기능 얹을
>    때(task-sharing 설계) 사고로 이어질 소지가 가장 큽니다.
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
