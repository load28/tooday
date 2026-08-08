# T037 — 전체 스택 러스트 마이그레이션 (rust/ 서브프로젝트)

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-08-07
- 완료: 2026-08-07

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
| Kysely + pg | sqlx 0.8 (postgres) | 이력 테이블도 `kysely_migration` 그대로 |
| PGlite (WASM Postgres) | 대응물 없음 → 인메모리 어댑터 | TS도 테스트는 InMemory* 어댑터로 돈다 (`app.test.ts:42-57`) |
| hono/jwt | jsonwebtoken 9 | HS256 |
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
  리다이렉트·화면·캐시 정책)은 CSR로도 동일하게 보존된다. 사용자가 "CSR로 모두
  구현한다고 치고" 만들라고 확정해, **CSR을 이 구현의 스펙으로 삼는다**.

## 완료 기준

- [x] `rust/crates/shared` — 계약 타입·검증이 valibot 스키마와 동일 규칙
- [x] `rust/crates/bff` — tRPC 프로시저 전부(`pub.*`, `auth.*`, `user.*`, `task.*`)
- [x] `rust/crates/web` — 화면 전부(오늘/프로젝트/프로젝트 상세/새 태스크/태스크
      상세/로그인/회원가입/설정) + 라우트 가드
- [x] TS 테스트 포팅본이 통과: `cargo test --workspace` 166건 (`app.test.ts` 591줄 전량 포함)
- [x] `cargo build` (bff) + `cargo build --target wasm32-unknown-unknown` (web)
- [x] `cargo clippy --workspace --all-targets -- -D warnings`, `cargo fmt --all --check`

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
>
> [중략 — BFF·웹 구현 및 1차 커밋]
>
> **사용자**: csr로 모두 구현한다고 치고 러스트로 만들어봐
>
> **Claude**: CSR을 최종 스펙으로 잡고 완성하겠습니다. 지금 웹은 컴파일만 됐지
> **실제로 실행해 본 적이 없어서**, 진짜 도는 것까지 확인하는 게 남은 일입니다.

## 작업 로그

- 2026-08-07: 태스크 생성. 기존 스펙 전량 조사(계약 6파일, BFF 30파일, 웹 60파일,
  테스트 14파일). 툴체인 확인 — cargo 1.94.1, axum 0.8.9, dioxus 0.7.10, sqlx 0.9.0.

- 2026-08-07: 구현 완료.

  **shared** — valibot 스키마를 계약 타입 + `Validate` 트레잇으로. issue 종류 이름
  (`min_length`, `email`, `iso_date` …)을 계약으로 유지해 웹의 문구 매핑이 함께 움직인다.
  `taskPatchSchema`의 "미지정 vs 명시적 null"은 `Patch<T>` 열거형으로 가른다.

  **bff** — axum 8 + tRPC 와이어 포맷 직접 구현(경로·`?input=`·배치·성공/에러 봉투·
  JSON-RPC 코드·HTTP 상태). 어댑터는 인메모리 / sqlx(PostgreSQL) / redis.
  fractional indexing은 `rocicorp/fractional-indexing`을 그대로 옮겨 **같은 키**가
  나오는 것까지 테스트로 못박았다(기존 데이터 호환). 마이그레이션은 이름·순서·최종
  스키마를 유지하고 이력 테이블도 `kysely_migration`을 그대로 쓴다 — 두 구현이 같은
  데이터베이스를 두고 교체 가능하다.

  **web** — Dioxus 0.7 + dioxus-router. TanStack Query/Form은 이 앱이 쓰는 표면만
  옮겨 직접 구현했다(`shared::query`, `shared::form`). i18n은 파라미터 집합별 전용
  타입(`MsgMin`, `MsgDoneTotal` …)으로 플레이스홀더 계약을 컴파일 타임에 강제한다.
  스타일은 34개 `.css.ts`를 `assets/app.css` 한 벌로 옮겼다 — 토큰 값은 동일하고,
  variant는 `data-*` 속성으로 표현한다.

  검증: `cargo test --workspace` 166건 통과 (PostgreSQL 16 실서버 포함),
  `cargo clippy --workspace --all-targets -- -D warnings` 무경고,
  `cargo fmt --all --check` 통과, `cargo build -p tooday-web --target wasm32-unknown-unknown` 성공.

  남긴 것: SSR(현재 CSR), design-guide 앱. 사유는 [rust/README.md](../../rust/README.md) 참고.

- 2026-08-08: CSR을 스펙으로 확정하고 **실제 브라우저 구동까지 검증**.

  컴파일만 통과했던 웹을 실제로 띄우자 정적 검사로는 안 잡히는 문제가 넷 나왔다:

  1. **훅 순서 위반** — `TaskDetailScreen`이 `use_signal`보다 먼저 조기 반환했다.
     훅을 전부 위로 올리고, 제목 초안을 `Option<String>`(None = 서버 값 그대로)으로
     바꿔 태스크가 도착하기 전에도 훅을 부를 수 있게 했다.
  2. **wasm에 `SystemTime`이 없다** — `chrono::Local::now()`가 패닉했다.
     chrono의 `wasmbind` 기능을 켜 JS Date로 내려가게 했다(다른 타깃엔 영향 없음).
     타깃별로 갈라 뒀던 시각 조회도 한 갈래로 합쳤다.
  3. **캐시가 리렌더를 못 일으킨다** — 쿼리 캐시는 UI를 모르는 순수 구조라 낙관적
     패치·SSE 델타가 캐시에만 쓰이고 화면은 그대로였다. 캐시에 변경 알림
     (`CacheEvent::Written` / `Invalidated`)을 붙이고, UI 계층에서 시그널 두 개로 받는다 —
     쓰기는 리렌더만, 무효화는 재조회까지. 하나로 합치면 조회 → 쓰기 → 재조회가
     끝없이 돈다.
  4. **버튼 베이스 정렬이 카드로 샜다** — `interactive` 카드는 `<button>`이라
     `.base-button`의 가운데 정렬이 따라와 내용이 가운데로 몰리고 진행률 바가 0으로
     수축했다. `.card`에서 카드 의미(좌측 정렬·꽉 채움)로 되돌렸다.

  이래서 브라우저 E2E를 저장소에 넣었다([rust/e2e/](../../rust/e2e/)) — 회원가입 →
  검증 문구 → 오늘 화면 → 태스크 생성 → 완료 토글 → 상세 → 프로젝트 생성 → 보드 →
  로그아웃 → 보호 경로 리다이렉트 → 재로그인, 13단계를 실제 Chromium으로 돌고
  콘솔 에러가 하나라도 있으면 실패로 본다. 번들은 dx 없이 `wasm-bindgen`만으로
  만들도록 `scripts/build-web.sh`·`scripts/serve-web.py`를 뒀다.

  주의: 웹과 BFF는 같은 호스트로 띄워야 한다 — 쿠키가 `SameSite=Lax`라 호스트가
  갈리면 교차 사이트가 되어 인증이 통째로 실패한다(처음 E2E가 이걸로 401을 맞았다).

  검증: `cargo test --workspace` 167건 + 브라우저 E2E 13단계 통과,
  clippy(네이티브·wasm) `-D warnings` 무경고, `cargo fmt --check` 통과.
