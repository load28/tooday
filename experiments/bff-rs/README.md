# bff-rs — BFF task 슬라이스 Rust 포팅 (T036)

`apps/bff`의 **task 모듈 수직 슬라이스**를 Rust(std + serde)로 옮긴 실험 크레이트다.
목적은 프로덕션 대체가 아니라 **TypeScript(Hono + tRPC + valibot) 대비 타입 추론이
어디서 좋아지고 나빠지는지**를 실제 컴파일되는 코드로 비교하는 것.

전체 비교 분석은 [`docs/bff-rust-vs-typescript.md`](../../docs/bff-rust-vs-typescript.md).

## 매핑

| Rust | 대응 TS |
| --- | --- |
| `src/contract.rs` | `packages/shared/src/task.ts` (valibot 스키마·`InferOutput`) |
| `src/errors.rs` | `apps/bff/src/platform/errors.ts` + `trpc/init.ts`의 코드 매핑 |
| `src/ports.rs` | `apps/bff/src/modules/task/ports.ts` |
| `src/store.rs` | `apps/bff/src/modules/task/adapters/memory.ts` |
| `src/router.rs` | `apps/bff/src/modules/task/router.ts` |
| `src/ordering.rs` | `apps/bff/src/platform/ordering.ts` (append 경로만) |

## 범위

- **포함**: 계약 검증, 도메인 에러→전송 코드, 포트/어댑터, 9개 프로시저 핸들러, 정렬 append.
- **제외**: HTTP 프레임워크(axum 등), JWT, DB(Kysely)·Redis 어댑터, SSE 전송.
  추론 비교의 핵심이 아니라 인프라 결선 문제라 뺐다.
- 포트 메서드는 **동기**다(TS는 `Promise`). 인메모리라 IO가 없어 async trait로 tokio를
  끌어올 이유가 없다 — trait 모양이 비교의 본질이라 동기로 둔다.

## 실행

```bash
cd experiments/bff-rs
cargo test      # 11개: 라운드트립·소유자 스코프·필드 LWW·삭제 tombstone·집계·검증·에러 매핑·정렬
cargo clippy --all-targets
```

`experiments/`는 bun 워크스페이스(`apps/*`, `packages/*`) 밖이라 `bun install` /
`turbo` 빌드에 끼지 않는다. Rust 툴체인이 있을 때만 독립적으로 돈다.
