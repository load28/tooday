# T036 — Rust BFF 계약을 단일 진실로: valibot TS 스키마 코드젠

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-30
- 완료: 2026-07-30

## 배경

BFF를 Rust로 마이그레이션할 때, 지금 `packages/shared/src/*.ts`가 손으로 쓰는
valibot 스키마(계약)를 Rust 쪽이 소유하게 만들고 싶다. 계약이 두 곳(Rust 서버 /
TS 프론트)에 이중으로 존재하면 드리프트가 난다.

현재 계약은 valibot 스키마 + `v.InferOutput` 타입 파생 구조다:

- `packages/shared/src/task.ts:20` — `taskSchema` (pipe·isoDate·integer·minValue·
  nullable·optional-default·picklist-from-const·array·object-spread·check 총망라)
- `packages/shared/src/auth.ts:8` — 상수 참조 minLength(`MIN_PASSWORD_LENGTH`),
  object spread(`...tokenPairSchema.entries`), 크로스 모듈 참조(`userSchema`)
- `packages/shared/src/user.ts`, `pub.ts` — nullable, 중첩 object

핵심 관찰: valibot 계약의 가치는 **검증 액션**(`trim`, `minLength`, `isoDate`,
`integer`, `minValue`, `check`)에 있다. 이건 ts-rs(타입만)나 JSON Schema로는
표현이 안 된다. 그래서 "Rust 타입 → TS 타입" 수준이 아니라, **valibot 어휘를
그대로 미러링한 스키마 IR**을 Rust에 두어야 계약을 손실 없이 재현할 수 있다.

## 작업 내용

`apps/bff-rs/`에 cargo 워크스페이스를 신설한다 (미래 Rust BFF의 자리).

- `crates/contract/` — 스키마 IR(`ir.rs`) + valibot TS 이미터(`emit.rs`) +
  실제 계약 정의(`schemas/`: task·auth·user·pub) + 런타임 검증(`validate.rs`).
  **IR 하나에서 코드젠과 런타임 검증이 둘 다 나온다** — 이게 "단일 진실"의 실체.
- `crates/codegen/` — 바이너리. 레지스트리를 순회해 `packages/shared/src/generated/`에
  valibot `.ts` 모듈 + 배럴을 쓴다. `--check`는 디스크와 비교해 드리프트 시 exit 1.

생성물은 **직접 구현이 아니라 지금 쓰는 valibot 코드**다 — `import * as v from
'valibot'` + `v.pipe/v.object/...` + `export type X = v.InferOutput<typeof xSchema>`.

기존 손수 작성 파일은 건드리지 않는다. 대신 `generated/`에 병렬 생성하고,
**동등성 테스트**(bun test)로 생성 스키마 ≡ 손수 스키마(같은 입력에 같은 accept/
reject·파싱 결과)임을 증명한다. 이렇게 하면 동작 앱을 깨지 않고 코드젠의 충실성을
검증할 수 있다(추후 완전 컷오버는 별도 태스크).

기각한 대안:
- serde 구조체 + schemars(JSON Schema) → valibot: 검증 액션(trim/minLength/isoDate)
  손실. 계약의 핵심 가치를 못 옮긴다.
- ts-rs: 타입만 생성, 런타임 검증 0. 목적(검증 겸용)과 불일치.

"코드 변경 시 재생성" 배선: 루트 `codegen:contracts` / `:check` 스크립트,
lefthook pre-commit이 `apps/bff-rs/**/*.rs` 변경 시 `--check` 실행.

## 완료 기준

- [x] `apps/bff-rs` cargo 워크스페이스가 빌드된다 (`cargo build`)
- [x] `cargo run -p contract-codegen -- --out ...` 가 valibot TS를 생성한다
- [x] 생성 스키마 ≡ 손수 스키마 동등성 테스트 통과 (bun test, 20 pass)
- [x] contract crate 단위 테스트(런타임 검증) 통과 (`cargo test`, 10 pass)
- [x] `--check`가 드리프트 감지 시 exit 1 (재현 확인)
- [x] lefthook + 루트 스크립트 배선
- [x] typecheck 통과 (`bun run typecheck`, 4 packages)

## 대화 기록

> **사용자**: 한가지 쟈미있는걸해보자 bff로 스키마를 만들면 그게 프론트에 쓸수있는
> 타입이나 검증으로도 쓸수있어 러스트로 bff를 마이그레이션할때 어떤 기능을 만들어서
> 자동으로 타잊스크립트 스키마를 만들어주고 그 스키마가 타잊으로 뱐허ㅏㄴ될수있게
> 해보자 그리고 타잊스크맂트 스키마는 직젖구현이 아니라 라이브러리 지금 쓰는걸로
> 변환하자 그리고 코드가 변경될때마다 그에맞춰 코드잰더ㅣ어야함
>
> **Claude**: Rust가 계약의 단일 진실이 되도록 valibot 어휘를 미러링한 스키마 IR을
> Rust에 정의하고, 그 IR 하나에서 (1) valibot TS 스키마 코드젠 (2) Rust 런타임 검증을
> 둘 다 낸다. 타입은 생성된 valibot에서 `v.InferOutput`으로 파생. Rust 계약 변경 시
> 재생성하고 `--check`로 드리프트를 막는다. 기존 파일은 두고 `generated/`에 병렬
> 생성 + 동등성 테스트로 충실성 증명.

## 작업 로그

- 2026-07-30: `apps/bff-rs` cargo 워크스페이스 신설(contract + codegen 크레이트).
  스키마 IR(`ir.rs`, valibot 어휘 미러링) + valibot TS 이미터(`emit.rs`) +
  계약 정의(`schemas/`: task·auth·user·pub, 손수 파일과 1:1) + 런타임 검증
  (`validate.rs`, 같은 IR에서 파생). `contract-codegen` 바이너리로
  `packages/shared/src/generated/*.gen.ts` 생성. 생성 파일은 `.gen.ts`라 Biome
  제외 대상이라 `--check` 드리프트 가드가 안정적.
  - 검증: `cargo test` 10 pass(런타임 검증), `packages/shared` 동등성 테스트
    20 pass·95 assertions(생성 ≡ 손수), `bun run typecheck` 4패키지 통과,
    `bun run check`(Biome) 통과, `bun run lint:deps` 통과.
  - 드리프트 가드: 계약 변경 후 미재생성 시 `codegen:contracts:check` exit 1
    확인, 재생성 후 exit 0 복귀 확인.
  - 배선: 루트 `codegen:contracts` / `:check` 스크립트, lefthook pre-commit이
    `apps/bff-rs/crates/contract/src/**/*.rs` 변경 시 재생성+스테이징.
  - 참고: `apps/bff`·`apps/design-guide`의 test 프로세스 종료 코드 이슈는 본
    변경과 무관한 기존 환경 플레이키(테스트 자체는 0 fail).
