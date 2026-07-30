# T036 — BFF task 슬라이스 Rust 포팅 + TypeScript 대비 타입 추론 비교

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-30
- 완료: 2026-07-30

## 배경

현재 BFF(`apps/bff`)는 Hono + tRPC + valibot + Kysely로 짜여 있다. 계약은
valibot 스키마 하나에서 값(런타임 검증)과 타입(`v.InferOutput`)을 동시에 뽑고
(`packages/shared/src/task.ts`), 라우터는 tRPC의 엔드투엔드 추론에 얹혀 있으며
(`apps/bff/src/modules/task/router.ts`), 도메인 에러는 `as const satisfies
Record<...>`로 전송 코드에 매핑된다(`apps/bff/src/trpc/init.ts:8`).

이 구조를 Rust로 옮겼을 때 **타입 추론이 어디서 좋아지고 어디서 나빠지는지**를
실제로 컴파일되는 코드로 비교한다. 전면 재작성이 아니라 추론 특성이 가장 잘
드러나는 **task 모듈 수직 슬라이스**(계약·에러·포트·인메모리 어댑터·라우터·정렬)만
포팅한다. HTTP/JWT/DB 어댑터는 추론보다 인프라 결선 문제라 제외한다.

근거 파일:
- `packages/shared/src/task.ts` — valibot 스키마 → 타입 추론(`InferOutput`)
- `apps/bff/src/modules/task/{router,ports}.ts`, `adapters/memory.ts`
- `apps/bff/src/trpc/init.ts` — `as const satisfies` 에러 매핑
- `apps/bff/src/platform/{errors,ordering}.ts`

## 작업 내용

`experiments/bff-rs/`에 std + serde 만으로 task 슬라이스를 포팅한다(외부 런타임·DB
없이 컴파일·테스트되게). 그리고 `docs/bff-rust-vs-typescript.md`에 항목별 비교를
쓴다.

- **포팅 범위**: `contract`(Task/Project/patch/요청·응답/change), `errors`(DomainError
  enum + 전송 코드 매핑), `ports`(TaskStore/ProjectStore trait), `store`(인메모리
  어댑터 + sync 카운터), `router`(9개 프로시저 핸들러), `ordering`(정렬 키).
- **의도적 설계 선택**(비교 포인트):
  - valibot의 "스키마=값+타입"을 Rust에선 serde `try_from` 검증 뉴타입(IsoDate 등)으로.
  - patch의 `optional(nullable(...))` 3-상태(부재/null/값)를 `Option<Option<T>>` +
    serde `double_option`으로 충실히 표현.
  - 포트를 제네릭 trait 바운드로(정적 디스패치, 구조적 vs 명목적 대비).
  - 에러 매핑을 exhaustive `match`로(`satisfies Record` 대응).
- **기각**: async trait(tokio 유입) — 인메모리라 IO가 없어 동기 메서드로 두고 문서에
  차이를 명시. tRPC 대응 HTTP 프레임워크(axum) — 추론 비교의 핵심이 아니라 제외.

## 완료 기준

- [x] `experiments/bff-rs`가 `cargo test`로 그린 (11개: 라운드트립·소유자 스코프·필드 LWW·삭제 tombstone·집계·검증·3-상태 patch·에러 매핑·정렬)
- [x] `docs/bff-rust-vs-typescript.md`에 항목별(스키마추론/구조적·명목적/exhaustiveness/
      3-상태 patch/null·undefined/엔드투엔드 추론/에러 전파/지역추론) 비교 작성
- [x] `experiments/`는 워크스페이스 빌드(bun/turbo)에 끼지 않아 기존 스크립트 무영향 (`workspaces: apps/*, packages/*` 밖)

## 대화 기록

> **사용자**: 지금 bff짜여진부분을 러스트로 변경해보고 타입스크립트 대비 타입츠론이 뭐기 좊이지는지 비교해봐
>
> **Claude**: BFF의 task 모듈 수직 슬라이스(계약·에러·포트·인메모리 어댑터·라우터·정렬)를
> `experiments/bff-rs/`에 Rust(std+serde)로 포팅하고, `docs/bff-rust-vs-typescript.md`에
> 타입 추론 비교를 작성한다. 전면 재작성이 아니라 추론 특성이 드러나는 슬라이스만 옮긴다.

## 작업 로그

- 2026-07-30: 태스크 개시. BFF 구조 파악(README, task 모듈, shared 계약, trpc init) 후 포팅 착수.
- 2026-07-30: `experiments/bff-rs`에 task 슬라이스 포팅(contract/errors/ordering/ports/store/router).
  `cargo test` 11개 그린, `cargo clippy --all-targets` 경고 0. 비교 문서
  `docs/bff-rust-vs-typescript.md` 작성(9항목 + 결론 표). 검증: Rust 1.94, serde 1.

## 결론 요약

계약을 값 하나에서 뽑아 웹까지 자동 전파하는 **엔드투엔드 추론은 TS/tRPC가 압도**(Rust는
codegen 필요). 반대로 에러 전수 매핑(`match`)·3-상태 patch(`Option<Option>`)·null 부재
(`Option`)·실패의 시그니처 노출(`Result`)처럼 **불변식을 컴파일 타임에 못박는 추론은
Rust가 우위**. 한 줄로: 계약 전파는 TS, 불변식 강제는 Rust.
