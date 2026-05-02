# tooday

칸반 형태의 일정 관리 앱.

## Architecture

```
React Native (WebView) ── apps/web (TanStack Start) ── apps/bff (tRPC)
                                       └─────── packages/shared ──────┘
```

- **apps/web** — TanStack Start (Vite + Nitro). RN WebView가 띄우는 웹 화면.
- **apps/bff** — tRPC 서버 (예정).
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

