# tooday

칸반 형태의 일정 관리 앱.

## Architecture

```
React Native (WebView) ── apps/web (TanStack Start) ── apps/bff (Hono)
                                       └─────── packages/shared ──────┘

apps/design-guide ── 모바일 웹뷰용 디자인 프로토타입 (port 3001)
```

- **apps/web** — TanStack Start (Vite + Nitro). RN WebView가 띄우는 웹 화면.
- **apps/bff** — Hono BFF (port 3002). 인증 관문: httpOnly 쿠키(웹)와
  `Authorization: Bearer` 헤더(네이티브/웹뷰 브릿지)를 모두 지원.
  `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/me`, `/health`.
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

