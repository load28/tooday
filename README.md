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
  저장소는 SQLite(`bun:sqlite`)가 기본이며 Kysely(타입드 SQL + 다이얼렉트)로 접근 —
  스토어(포트) ↔ Kysely ↔ 다이얼렉트 계층 분리로 엔진 교체 시 코어 무변경.
- **apps/design-guide** — Toss 스타일 미니멀 디자인 가이드 / 화면 프로토타입.
  시간 뷰 (`/`), 프로젝트 보드 (`/projects`, `/projects/$id`), 태스크 상세
  (`/tasks/$id`), 디자인 토큰 카탈로그 (`/guide`).
- **packages/shared** — web ↔ bff 간 타입 공유 (TS 소스 직접 익스포트).

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

