# T037 — 전체 스택 러스트 마이그레이션 (rust/ 서브프로젝트)

- 상태: 진행중 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-08-07
- 완료: -

## 배경

현재 TooDay는 TypeScript 단일 스택이다 — `apps/web`(TanStack Start + React),
`apps/bff`(Hono + tRPC + Kysely), `packages/shared`(valibot 계약).

사용자가 "기존 프로젝트에 구현된 모든 코드를 러스트로, 웹은 Dioxus, 백엔드도
그에 맞는 러스트로, 사용하는 라이브러리 구조 전부 러스트로 마이그레이션하되
기존 스펙과 동일하게" 구현할 것을 요청했다. 기존 프로젝트는 그대로 두고
새 폴더(`rust/`)에 병렬 프로젝트로 만든다.

기존 스펙의 소재:

- 계약: `packages/shared/src/{api,auth,user,pub,task}.ts`
- BFF: `apps/bff/src/{app.ts,index.ts,trpc/,modules/,platform/}`
- 웹: `apps/web/src/{routes/,features/,entities/,shared/,styles/}`
- 스펙 검증 기준(포팅 대상 테스트): `apps/bff/src/app.test.ts`(591줄),
  `apps/bff/src/**/*.test.ts`, `apps/web/src/{shared/time,entities/task/patch}.test.ts`

## 작업 내용

`rust/` 아래 Cargo 워크스페이스로 3계층을 그대로 옮긴다 (디렉토리 전략도 동일 —
도메인 수직 슬라이스 + 헥사고날 라이트).

```
rust/
  crates/shared/   # packages/shared 대응 — 계약 + 검증 규칙
  crates/bff/      # apps/bff 대응 — axum + tRPC 호환 라우터
  crates/web/      # apps/web 대응 — Dioxus
```

라이브러리 대응:

| TS | Rust | 비고 |
| --- | --- | --- |
| Hono | axum 0.8 | 라우팅·미들웨어 |
| tRPC | 직접 구현 (`trpc/`) | HTTP 와이어 포맷(경로·envelope·에러코드)을 동일하게 |
| valibot | 직접 구현 (`shared/validate`) | issue 타입 이름까지 계약으로 유지 |
| Kysely + pg | sqlx 0.9 (postgres) | 타입드 SQL |
| PGlite (WASM Postgres) | 대응물 없음 → 인메모리 어댑터 | TS도 테스트는 InMemory* 어댑터로 돈다 (`app.test.ts:42-57`) |
| hono/jwt | jsonwebtoken 11 | HS256 |
| Bun.password (bcrypt) | argon2 | 해시 알고리즘은 구현 세부 — 계약 아님 |
| Bun RedisClient | redis 0.27 | opt-in |
| React + TanStack Router | Dioxus 0.7 + dioxus-router | |
| TanStack Query | 직접 구현 (`web/query`) | 캐시·낙관적 패치·invalidate 스펙 유지 |
| vanilla-extract | 정적 CSS + 동일 토큰 | `styles/theme.css.ts`의 CSS 변수 계약 그대로 |

기각한 대안:

- **PGlite 대체로 SQLite 임베디드**: SQL 방언이 갈라져 "같은 SQL·마이그레이션"
  이라는 기존 스펙(README:23-27)이 깨진다. 인메모리 포트 구현으로 간다.
- **tRPC 대신 REST 재설계**: 웹↔BFF 와이어 포맷이 바뀌면 "기존 스펙 동일"이 아니다.
- **Dioxus fullstack SSR**: 기존 웹은 SSR이지만, 스펙의 관찰 가능한 계약(가드·
  리다이렉트·화면·캐시 정책)은 CSR로도 동일하게 보존된다. SSR은 후속 과제.

## 완료 기준

- [ ] `rust/crates/shared` — 계약 타입·검증이 valibot 스키마와 동일 규칙
- [ ] `rust/crates/bff` — tRPC 프로시저 전부(`pub.*`, `auth.*`, `user.*`, `task.*`)
- [ ] `rust/crates/web` — 화면 전부(오늘/프로젝트/프로젝트 상세/새 태스크/태스크
      상세/로그인/회원가입/설정) + 라우트 가드
- [ ] TS 테스트 포팅본이 통과: `cargo test` (특히 `app.test.ts` 591줄 전량)
- [ ] `cargo build` (bff) + `cargo build --target wasm32-unknown-unknown` (web)
- [ ] `cargo clippy -- -D warnings`, `cargo fmt --check`

## 대화 기록

> **사용자**: 지금 구현된 이 프로잭트에 폴더 하나 더 만들고 그 안에 프로젝트를 아예
> 하나 만들고 싶은데 기존에 프로젝츠에 구현된 모든 코드를 러스트로 만드은것이다
> 웹도 dixus로 뱍엔드도 그에 맞는 러스트로 그리고 사용하는 라이브러리 구조 전부
> 언어를 러스트로 마이그레이션하되 기존 스펙과 동일하게 구현해달라
>
> **Claude**: 프로젝트 전체를 러스트(웹은 Dioxus, 백엔드는 러스트)로 마이그레이션하는
> 큰 작업이네요. 먼저 기존 프로젝트의 구조와 스펙을 파악하겠습니다.
>
> **사용자**: 모든 스펙이 똑같아야한다 그리고 건증되어야한다
>
> **Claude**: 이해했습니다. 스펙 완전 동일 + 검증(테스트 통과)까지 목표로
> 진행하겠습니다. 기존 테스트도 함께 러스트로 포팅해 `cargo test`로 스펙 동등성을
> 검증하는 방식으로 가겠습니다. 남은 스펙 파일들을 마저 읽겠습니다.
>
> **사용자**: 모델을 오파스5로 바꿈
>
> **Claude**: 모델 변경 확인했습니다. 계속 진행합니다 — DB 계층과 웹 화면 스펙을
> 읽겠습니다.

## 작업 로그

- 2026-08-07: 태스크 생성. 기존 스펙 전량 조사(계약 6파일, BFF 30파일, 웹 60파일,
  테스트 14파일). 툴체인 확인 — cargo 1.94.1, axum 0.8.9, dioxus 0.7.10, sqlx 0.9.0.
