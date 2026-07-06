# tooday

칸반 형태의 일정 관리 앱.

## Architecture

```
React Native (WebView) ── apps/web (TanStack Start) ── apps/bff (Hono)
                                       └─────── packages/shared ──────┘

apps/design-guide ── 모바일 웹뷰용 디자인 프로토타입 (port 3001)
```

- **apps/web** — TanStack Start (Vite + Nitro). RN WebView가 띄우는 웹 화면.
- **apps/bff** — Hono + tRPC BFF (port 3002). httpOnly 쿠키(웹)와
  `Authorization: Bearer` 헤더(네이티브/웹뷰 브릿지) 이중 인증 지원.
  모든 데이터 API는 `/trpc` — 프라이빗(`auth.*`, `user.*`)은 `private, no-store`,
  공개(`pub.*`) 쿼리만 public Cache-Control로 HTTP 캐시를 탄다.
  클라이언트는 노배치(`httpLink`)가 기본.
  쓰기는 의도(intent) 기반 부분 업데이트(필드 단위 LWW — 409 없음), 기기 간
  수렴은 유저별 sync seq 커서(`task.changes`) + SSE 신호 채널(`/sync/events`)로
  한다 — 신호는 힌트, 커서가 진실.
  저장소는 PostgreSQL — 배포는 `DATABASE_URL`(pg 커넥션 풀), 개발·테스트는
  미설정 시 임베디드 PGlite(WASM Postgres)로 동일한 SQL·마이그레이션을 실행한다.
  접근은 Kysely(타입드 SQL + 다이얼렉트), 스키마 변경은 버전드 마이그레이션
  (`platform/db/migrations.ts`, 부팅 시 Kysely Migrator가 적용)로만 한다.
  스토어(포트) ↔ Kysely ↔ 다이얼렉트 계층 분리로 엔진 교체 시 코어 무변경.
  세션은 `SessionStore` 포트라 백엔드 교체가 자유롭다 — `REDIS_URL` 설정 시 Redis
  (Bun 내장 클라이언트, 네이티브 TTL로 만료 스윕 불필요, 세션 값에 유저 스냅샷을 담아
  인증 핫패스가 DB를 안 탄다), 미설정이면 DB 세션 테이블(만료 스윕 배치 동반).
  `DATABASE_URL`과 같은 opt-in 패턴이라 개발·테스트는 외부 의존성 0.
- **apps/design-guide** — Toss 스타일 미니멀 디자인 가이드 / 화면 프로토타입.
  시간 뷰 (`/`), 프로젝트 보드 (`/projects`, `/projects/$id`), 태스크 상세
  (`/tasks/$id`), 디자인 토큰 카탈로그 (`/guide`).
- **packages/shared** — web ↔ bff 간 타입 공유 (TS 소스 직접 익스포트).

## Directory strategy

도메인 수직 슬라이스 + 헥사고날 라이트. 경계는 dependency-cruiser가 CI에서 강제한다
(`bun run lint:deps`).

```
apps/bff/src/
  modules/<domain>/   # 도메인 수직 슬라이스 — 포트·어댑터·tRPC 라우터 코로케이션
                      #   (auth/, user/, pub/ … 모듈 간 직접 import 금지)
  platform/           # 도메인 무관 인프라 — db/, config, errors, logging, http
                      #   (platform → modules 역참조 금지)
  trpc/               # tRPC 접착 코드 — init, context, cache + 라우터 조립(router.ts)

apps/web/src/
  routes/             # TanStack 파일 라우팅 — 배선만 (가드·리다이렉트·화면 연결)
  features/<feature>/ # 화면·폼·쿼리 등 기능 코드 (auth/, today/, tasks/, projects/)
  app/                # 앱 셸 — tRPC 클라이언트, global.css
  shared/ui/          # 도메인 무관 디자인 시스템 프리미티브
                      # 의존 방향: routes → features → app/shared (역방향 금지)

packages/shared/src/  # web ↔ bff 계약만 — 도메인별 파일 (auth, user, api) + index 배럴
```

새 도메인 추가 시: `packages/shared/src/<domain>.ts`(스키마) →
`apps/bff/src/modules/<domain>/`(포트·어댑터·라우터, `trpc/router.ts`에 조립) →
`apps/web/src/features/<domain>/`(화면) → `routes/`에 배선.

## Stack

- Bun workspaces + Turborepo
- TypeScript, React 19, TanStack Router/Start
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

