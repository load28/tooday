# tooday

칸반 형태의 일정 관리 앱.

## Architecture

```
React Native (WebView) ── apps/web (TanStack Start) ── apps/bff (Hono) ── apps/api (Rust)
                                       └────── packages/shared ─────┘

apps/design-guide ── 모바일 웹뷰용 디자인 프로토타입 (port 3001)
```

- **apps/web** — TanStack Start (Vite + Nitro). RN WebView가 띄우는 웹 화면.
- **apps/bff** — Hono + tRPC BFF (port 3002). **조립층** — tRPC 계약·에러 매핑,
  httpOnly 쿠키(웹)와 `Authorization: Bearer` 헤더(네이티브/웹뷰 브릿지) 이중 인증,
  HTTP 캐시 정책, SSE 신호 채널만 소유하고, 실제 내부 동작은 전부 apps/api(러스트)에
  HTTP 어댑터로 위임한다(포트·어댑터 구조는 유지 — SQL 어댑터가 HTTP 어댑터로 바뀜).
  모든 데이터 API는 `/trpc` — 프라이빗(`auth.*`, `user.*`)은 `private, no-store`,
  공개(`pub.*`) 쿼리만 public Cache-Control로 HTTP 캐시를 탄다.
  클라이언트는 노배치(`httpLink`)가 기본.
  쓰기는 의도(intent) 기반 부분 업데이트(필드 단위 LWW — 409 없음), 기기 간
  수렴은 유저별 sync seq 커서(`task.changes`) + SSE 신호 채널(`/sync/events`)로
  한다 — 신호는 힌트, 커서가 진실.
- **apps/api** — Rust(axum + sqlx) 내부 API (port 3003). **실제 내부 동작의 소유자** —
  인증(argon2id 해싱, HS256 액세스 JWT `sub`/`sid`, 리프레시 회전: idle 슬라이딩 +
  absolute 하드캡 + 재사용 탐지 시 세션 일괄 무효화, 세션 라이브니스), 태스크·프로젝트
  데이터(유저별 advisory lock으로 sync seq 발급·필드 단위 LWW·tombstone), fractional
  정렬 키(npm fractional-indexing과 바이트 동일 — 패리티 테스트로 고정).
  저장소는 PostgreSQL(`DATABASE_URL`, 미설정 시 docker-compose 기본값) — 스키마 변경은
  sqlx 마이그레이션(`apps/api/migrations/`, 부팅 시 적용)로만 한다.
  리프레시 토큰 저장소는 `REDIS_URL` 설정 시 Redis(라이브니스=EXISTS, 네이티브 TTL로
  스윕 불필요), 미설정이면 DB 테이블(+시간별 만료 스윕).
  BFF ↔ API 사이는 `INTERNAL_API_TOKEN` Bearer로 신뢰 경계(프로덕션 필수).
  매 요청 인증은 API `/internal/auth/verify` 한 호출(JWT 검증 + 라이브니스, 유저 조회는
  안 탐)로 즉시 무효화까지 얻는다.
  자세한 설계는 [docs/authentication-architecture.md](docs/authentication-architecture.md).
- **apps/design-guide** — Toss 스타일 미니멀 디자인 가이드 / 화면 프로토타입.
  시간 뷰 (`/`), 프로젝트 보드 (`/projects`, `/projects/$id`), 태스크 상세
  (`/tasks/$id`), 디자인 토큰 카탈로그 (`/guide`).
- **packages/shared** — web ↔ bff 간 타입 공유 (TS 소스 직접 익스포트).

## Directory strategy

도메인 수직 슬라이스 + 헥사고날 라이트. 경계는 dependency-cruiser가 CI에서 강제한다
(`bun run lint:deps`).

```
apps/api/src/         # 러스트 내부 API — auth/(jwt·password·refresh·routes),
                      #   task.rs, user.rs, sync_seq.rs, ordering.rs, migrations/
apps/bff/src/
  modules/<domain>/   # 도메인 수직 슬라이스 — 포트·어댑터(HTTP/인메모리)·tRPC 라우터
                      #   (auth/, user/, pub/ … 모듈 간 직접 import 금지)
  platform/           # 도메인 무관 인프라 — api-client, config, errors, logging, http
                      #   (platform → modules 역참조 금지)
  trpc/               # tRPC 접착 코드 — init, context, cache + 라우터 조립(router.ts)

apps/web/src/
  routes/             # TanStack 파일 라우팅 — 배선만 (가드·리다이렉트·화면 연결)
  features/<feature>/ # 화면·폼·쿼리 등 기능 코드 (auth/, today/, tasks/, projects/)
                      #   feature 간 직접 import 금지 — 도메인 공용은 entities/,
                      #   도메인 무관은 shared/, 조립은 routes/
  entities/<domain>/  # 도메인 공용 모델·표시 상수 (task/) — FSD entities만
                      #   부분 채택 (docs/conventions/web-entities.md)
  app/                # 앱 셸 — tRPC 클라이언트, global.css
  shared/ui/          # 도메인 무관 디자인 시스템 프리미티브
                      # 의존 방향: routes → features → entities → app/shared (역방향 금지)

packages/shared/src/  # web ↔ bff 계약만 — 도메인별 파일 (auth, user, api) + index 배럴
```

새 도메인 추가 시: `packages/shared/src/<domain>.ts`(스키마) →
`apps/api/src/<domain>.rs`(실제 동작·엔드포인트) →
`apps/bff/src/modules/<domain>/`(포트·HTTP 어댑터·라우터, `trpc/router.ts`에 조립) →
`apps/web/src/features/<domain>/`(화면) → `routes/`에 배선.

## Stack

- Bun workspaces + Turborepo
- TypeScript, React 19, TanStack Router/Start
- Rust (axum + sqlx) — apps/api
- Biome (lint + format)

## Scripts

루트에서 실행:

```bash
bun install        # 워크스페이스 설치
bun run dev        # apps/web 개발 서버
bun run build      # 프로덕션 빌드
bun run typecheck  # 전체 타입체크
bun run check      # Biome lint + format 검사
bun run format     # Biome 포맷
```

### 로컬 인프라 (Docker)

실제 서버가 필요한 것(PostgreSQL, Redis)만 `docker-compose.yml`로 한 번에 관리한다.
apps/api(러스트)는 PostgreSQL이 필수라 **개발 전에 `bun run infra:up`으로 postgres를
띄워야 한다** (API의 기본 `DATABASE_URL`이 compose 접속 문자열이라 env 없이 바로 붙는다).
Redis는 리프레시 토큰 저장소 opt-in일 때만 필요하다.

```bash
bun run infra:up     # postgres + redis 기동 (healthcheck 통과까지 대기)
bun run infra:down   # 중지 (데이터 볼륨은 유지)
bun run infra:logs   # 로그 팔로우
bun run infra:reset  # 중지 + 볼륨 삭제 (데이터 초기화)
```

env 오버라이드는 `apps/api/.env.example`(DATABASE_URL/REDIS_URL/JWT/TTL/내부 토큰),
`apps/bff/.env.example`(API_URL/내부 토큰/쿠키) 참고. apps/api 개발은 Rust 툴체인(cargo)이 필요하다.

