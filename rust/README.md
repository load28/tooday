# tooday (Rust)

루트 TS 프로젝트([../README.md](../README.md))를 언어·라이브러리까지 전부 러스트로 옮긴
병렬 구현. **기존 스펙과 동일**하게 동작하는 것이 목표이고, TS 테스트를 포팅해 그것을
검증한다.

## Architecture

```
crates/web (Dioxus) ── crates/bff (axum)
          └──── crates/shared ────┘
```

- **crates/shared** — web ↔ bff 계약. TS `packages/shared`(valibot) 대응. 검증 규칙만
  담고 사용자향 문구는 화면이 소유한다. issue 종류 이름(`min_length`, `email` …)이
  계약이라 웹의 문구 매핑과 함께 움직인다.
- **crates/bff** — axum + tRPC 호환 라우터 (port 3002). httpOnly 쿠키(웹)와
  `Authorization: Bearer` 헤더(네이티브/웹뷰 브릿지) 이중 인증. 모든 데이터 API는
  `/trpc` — 프라이빗(`auth.*`, `user.*`)은 `private, no-store`, 공개(`pub.*`) 쿼리만
  public Cache-Control로 HTTP 캐시를 탄다.
  쓰기는 의도(intent) 기반 부분 업데이트(필드 단위 LWW — 409 없음), 기기 간 수렴은
  유저별 sync seq 커서(`task.changes`) + SSE 신호 채널(`/sync/events`)로 한다 —
  신호는 힌트, 커서가 진실.
  인증은 무상태 액세스 JWT(`sid` 클레임) + 회전 리프레시 토큰 — 매 요청은 서명·만료
  검증 + 세션 라이브니스 체크 1회로 즉시 무효화까지 얻는다. 회전 시 idle 슬라이딩 +
  absolute 하드캡 + 재사용 탐지(세션 무효화)를 건다.
- **crates/web** — Dioxus 0.7 + dioxus-router로 만든 **CSR** 앱. 화면·라우트 가드·쿼리 캐시.
  정적 셸(`index.html`)이 먼저 뜨고 wasm이 그 위에 마운트된다 — locale은 `navigator.language`,
  세션 게이트는 마운트 후 `user.me`로 판정한다.

## Directory strategy

TS와 같다 — 도메인 수직 슬라이스 + 헥사고날 라이트.

```
crates/bff/src/
  modules/<domain>/   # 도메인 수직 슬라이스 — 포트·어댑터·tRPC 라우터 코로케이션
                      #   (auth/, user/, pub_/, task/ … 모듈 간 직접 참조 금지)
  platform/           # 도메인 무관 인프라 — db/, config, errors, logging, ordering
                      #   (platform → modules 역참조 금지)
  trpc/               # tRPC 접착 코드 — init, context, cache + 라우터 조립(router.rs)

crates/web/src/
  routes/             # 배선만 (가드·리다이렉트·화면 연결)
  features/<feature>/ # 화면·폼·쿼리 등 기능 코드 (auth/, today/, tasks/, projects/)
                      #   feature 간 직접 참조 금지 — 도메인 공용은 entities/,
                      #   도메인 무관은 shared/, 조립은 routes/
  entities/<domain>/  # 도메인 공용 모델·표시 상수 (task/)
  app/                # 앱 셸 — tRPC 클라이언트, 프로시저 경로·쿼리 키, 컨텍스트
  shared/ui/          # 도메인 무관 디자인 시스템 프리미티브
                      # 의존 방향: routes → features → entities → app/shared (역방향 금지)

crates/shared/src/    # web ↔ bff 계약만 — 도메인별 모듈 (auth, user, pub_config, task)
```

## Library mapping

| TS | Rust | 비고 |
| --- | --- | --- |
| Hono | axum 0.8 | 라우팅·미들웨어 |
| tRPC | 직접 구현 (`trpc/`) | HTTP 와이어 포맷(경로·envelope·에러 코드)이 같다 |
| valibot | 직접 구현 (`shared::validate`) | issue 종류 이름까지 계약으로 유지 |
| Kysely + pg | sqlx 0.8 | 이력 테이블도 `kysely_migration` 그대로 — 같은 DB를 두 구현이 나눠 쓴다 |
| PGlite (WASM Postgres) | 대응물 없음 → 인메모리 어댑터 | 아래 참고 |
| hono/jwt | jsonwebtoken 9 | HS256 |
| Bun.password | argon2 | 해시 알고리즘은 저장소 구현 세부 — 계약 아님 |
| Bun RedisClient | redis 0.27 | opt-in |
| React + TanStack Router | Dioxus 0.7 + dioxus-router | |
| TanStack Query | 직접 구현 (`shared::query`) | 캐시·낙관적 패치·invalidate 스펙 유지 |
| TanStack Form | 직접 구현 (`shared::form`) | 화면 소유 문구 매핑 유지 |
| vanilla-extract | 정적 CSS (`crates/web/assets/app.css`) | 토큰 값은 `theme.css.ts`와 동일 |
| lucide-react | 인라인 SVG (`shared::ui::icons`) | 아이콘 라이브러리를 번들에 싣지 않는다 |

### PGlite의 부재

TS는 개발·테스트에서 임베디드 PGlite로 프로덕션과 같은 SQL·마이그레이션을 돌렸다.
러스트에는 임베디드 Postgres 대응물이 없으므로, 같은 포트를 만족하는 **인메모리
어댑터**로 외부 의존성 0을 유지한다 — TS도 앱 레벨 테스트(`app.test.ts`)는 InMemory\*
어댑터로 돌았으므로 검증 경로는 같다. SQL 어댑터는 실제 PostgreSQL로 검증한다(아래).

## Scripts

```bash
cargo build                 # 전체 빌드
cargo test --workspace      # 전체 테스트
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --all -- --check

cargo run -p tooday-bff     # BFF 기동 (기본 3002, DATABASE_URL 없으면 인메모리)

./scripts/build-web.sh      # CSR 번들 → dist/ (wasm-bindgen-cli 필요)
./scripts/serve-web.py dist 8080   # 정적 서버 (클라이언트 라우트는 index.html 폴백)
```

웹과 BFF는 **같은 호스트**로 띄운다. 인증 쿠키가 `SameSite=Lax`라 호스트가 갈리면
(예: 웹 `127.0.0.1`, BFF `localhost`) 교차 사이트가 되어 쿠키가 실리지 않는다:

```bash
BFF_ALLOWED_ORIGINS=http://localhost:8080 cargo run -p tooday-bff
./scripts/serve-web.py dist 8080   # → http://localhost:8080
```

`wasm-bindgen-cli`는 `Cargo.lock`의 `wasm-bindgen`과 같은 버전이어야 한다:

```bash
cargo install wasm-bindgen-cli --version 0.2.126
```

## Verification

TS 테스트를 포팅해 스펙 동등성을 검증한다. `cargo test --workspace` 기준 **167건**:

| 대상 | 옮긴 원본 | 건수 |
| --- | --- | --- |
| HTTP 계약 (tRPC 경로·상태·쿠키·캐시·SSE) | `apps/bff/src/app.test.ts` (591줄) | 32 |
| auth 스토어 포트 계약 | `modules/auth/adapters/adapters.test.ts` | 13 |
| task·user 스토어 포트 계약 | `modules/task,user/adapters/adapters.test.ts` | 10 |
| fractional indexing | `platform/ordering.test.ts` | 5 |
| 캐시 정책 | `trpc/cache.test.ts` | 7 |
| 리프레시 스윕·저장소 선택 | `refresh-token-sweeper/-store.test.ts` | 5 |
| 시간 포맷 | `shared/time.test.ts` | 11 |
| 낙관적 패치 | `entities/task/patch.test.ts` | 3 |
| 쿼리 캐시 | `shared/query.test.ts` | 10 |
| 그 외 (계약 검증, 토큰, 쿠키, 델타 반영, 주간 창, i18n, 캐시 구독 …) | — | 71 |

포팅 외에 러스트 쪽에서 새로 못박은 것:

- fractional indexing이 참조 구현(`rocicorp/fractional-indexing`)과 **같은 키**를 내는지
  — 기존 데이터와의 호환 계약.
- 스토어 포트 계약을 인메모리와 **실제 PostgreSQL 16** 양쪽에 돌린다. 마이그레이션 6개가
  매번 새 데이터베이스에 적용되므로 스키마도 함께 검증된다.

### 브라우저 E2E

`cargo test`는 브라우저에서만 드러나는 문제를 잡지 못한다 — 실제로 실행해 보고서야
훅 호출 순서 위반, wasm에서 없는 `SystemTime`, 캐시가 리렌더를 못 일으키는 문제,
버튼 베이스 정렬이 카드로 새는 CSS 계단을 찾았다. 그래서 실제 Chromium으로
전 화면을 도는 시나리오를 [e2e/](e2e/)에 둔다 — 회원가입 → 검증 문구 → 오늘 화면 →
태스크 생성 → 완료 토글(낙관적) → 태스크 상세 → 프로젝트 생성 → 보드 → 로그아웃 →
보호 경로 리다이렉트 → 재로그인 후 데이터 유지, 13단계. 브라우저 콘솔 에러가 하나라도
있으면 실패로 본다.

```bash
cd e2e && npm install && npm test
```

### SQL 어댑터

SQL 경로는 서버가 있을 때만 돈다:

```bash
TOODAY_TEST_DATABASE_URL="postgres://postgres@127.0.0.1:5432/postgres" cargo test --workspace
```

미설정이면 SQL 케이스는 조용히 건너뛰고 인메모리 구현만 검증한다.

## CSR로 정한 것

TS 웹은 TanStack Start의 SSR을 쓰지만, 이 구현은 **CSR을 스펙으로 삼는다**. 관찰 가능한
계약(가드·리다이렉트·화면·캐시 정책·와이어 포맷)은 그대로 두고, SSR이 서버에서 하던
일만 클라이언트로 옮겼다:

| SSR이 하던 일 | CSR에서 |
| --- | --- |
| `Accept-Language`로 locale 결정 | `navigator.language` (`resolve_locale`) |
| 요청 쿠키를 BFF로 전달 | 브라우저가 `credentials: include`로 직접 실어 보낸다 |
| loader가 렌더 전에 쿼리를 채움 | `use_cached_query` — 캐시가 있으면 즉시, 없을 때만 로딩 |
| 첫 페인트에 마크업 포함 | 정적 셸(`index.html`)이 스타일과 함께 먼저 뜨고 wasm이 마운트 |

대가는 첫 화면에 wasm 로드가 끼는 것(현재 번들 2.0MB, gzip 미적용)이고,
얻는 것은 서버 런타임이 정적 파일 서빙으로 줄어드는 것이다.

## 미구현

- **design-guide 앱** — 디자인 프로토타입은 옮기지 않았다. 토큰은
  `crates/web/assets/app.css`가 같은 값으로 들고 있다.
