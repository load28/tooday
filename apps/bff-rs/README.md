# apps/bff-rs — Rust BFF (계약 단일 진실 + valibot 코드젠)

BFF를 Rust로 옮기면서, 지금 `packages/shared/src/*.ts`가 손으로 쓰던 valibot
계약을 **Rust 쪽이 소유**하게 만든다. 계약을 한 곳(Rust)에 선언하고 두 소비처가
그것에서 파생된다:

```
                          apps/bff-rs/crates/contract   ← 계약의 단일 진실 (스키마 IR)
                                     │
                 ┌───────────────────┴───────────────────┐
       emit.rs   │                                       │  validate.rs
   (valibot TS 코드젠)                              (서버 런타임 검증)
                 ▼                                       ▼
  packages/shared/src/generated/*.gen.ts        들어오는 JSON을 같은 규칙으로 검증
   → v.InferOutput 으로 타입 파생 (프론트)
```

## 왜 IR인가 (ts-rs / JSON Schema가 아니라)

valibot 계약의 값어치는 **검증 액션**(`trim`, `minLength`, `isoDate`, `integer`,
`minValue`, `check`)에 있다. "Rust 구조체 → TS 타입" 류(ts-rs)나 JSON Schema는
이 액션을 표현하지 못해 계약을 손실 없이 옮길 수 없다. 그래서 valibot의 어휘를
그대로 미러링한 스키마 IR(`crates/contract/src/ir.rs`)을 두고, 계약을 그 IR로
선언한다(`crates/contract/src/schemas/`).

생성물은 자체 구현 검증기가 아니라 **지금 쓰는 valibot 코드 그대로**다
(`import * as v from 'valibot'` + `v.pipe/v.object/...`). 타입은 기존처럼
`v.InferOutput<typeof xSchema>`로 파생된다.

## 크레이트

- `crates/contract` — 스키마 IR + 계약 정의 + valibot 이미터(`emit.rs`) +
  런타임 검증(`validate.rs`). 코드젠과 검증이 **같은 IR**에서 나온다.
- `crates/codegen` — `contract-codegen` 바이너리. 레지스트리를 순회해
  `packages/shared/src/generated/`에 `.gen.ts`를 쓴다. `--check`는 디스크와
  비교해 드리프트 시 exit 1.

## 사용

루트에서:

```bash
bun run codegen:contracts        # valibot TS 재생성
bun run codegen:contracts:check  # 드리프트 검사 (CI)
```

`cargo test`로 계약 런타임 검증 단위 테스트를, `packages/shared`의
`generated.equivalence.test.ts`로 생성 스키마 ≡ 손수 스키마 동등성을 검증한다.

## 코드 변경 시 재생성

Rust 계약(`crates/contract/src/schemas/**`)을 고치면 lefthook pre-commit이
`codegen:contracts`를 돌려 `.gen.ts`를 재생성하고 함께 스테이징한다.
생성 파일은 `*.gen.ts`라 Biome가 손대지 않는다(`biome.json`이 이미 제외).

> 현재는 손수 작성한 `packages/shared/src/*.ts`를 **그대로 두고** `generated/`에
> 병렬 생성해 동등성으로 충실성을 증명한다. 완전 컷오버(생성물을 계약의
> 정본으로 승격)는 별도 태스크에서 한다.
