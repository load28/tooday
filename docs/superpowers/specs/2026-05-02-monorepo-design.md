# Turborepo Monorepo Design

**Date:** 2026-05-02
**Status:** Approved (pending implementation)

## 목표

현재 단일 TanStack Start 앱(`tooday`)을 Turborepo 기반 모노레포로 재구성한다.
- `apps/web`: 현재 TanStack Start 앱
- `apps/bff`: 추후 tRPC 서버를 위한 스텁
- `packages/shared`: web ↔ bff 간 타입 공유 (소스 직접 익스포트)

패키지 매니저는 **bun workspaces**, 패키지 스코프는 **`@tooday/*`** 사용.

## 디렉토리 구조

```
tooday/
├── apps/
│   ├── web/
│   │   ├── src/                 # 기존 src/ 이동
│   │   ├── public/              # 기존 public/ 이동
│   │   ├── .tanstack/           # 기존 .tanstack/ 이동
│   │   ├── vite.config.ts       # 기존 파일 이동
│   │   ├── tsconfig.json        # 루트 base를 extends
│   │   └── package.json         # name "@tooday/web"
│   └── bff/
│       └── package.json         # 최소 스텁 (name "@tooday/bff")
├── packages/
│   └── shared/
│       ├── src/
│       │   └── index.ts         # 빈 barrel: `export {}`
│       ├── tsconfig.json
│       └── package.json         # name "@tooday/shared"
├── docs/                        # 본 spec 등
├── package.json                 # 루트 워크스페이스 + 공통 devDeps
├── turbo.json
├── tsconfig.base.json
├── biome.json                   # 루트 (모노레포 전체 린트)
├── bun.lockb                    # 루트 단일
├── .cta.json                    # 루트
├── .gitignore
└── README.md
```

루트에 잔류하는 파일/디렉토리: `biome.json`, `bun.lockb`, `.cta.json`, `.gitignore`, `README.md`, `.idea/`, `.vscode/`, `docs/`.

## 패키지 정의

### 루트 `package.json`

워크스페이스 정의 + 공통 도구만 호이스팅:

```json
{
  "name": "tooday",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.1.45",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "biome lint",
    "check": "biome check",
    "format": "biome format"
  },
  "devDependencies": {
    "@biomejs/biome": "2.4.5",
    "turbo": "^2.9.7",
    "typescript": "^6.0.2"
  }
}
```

`packageManager` 필드는 Turbo의 워크스페이스 인식에 필요. 버전은 실제 사용하는 Bun과 일치시킴.

### `apps/web/package.json`

기존 루트 `package.json`의 모든 앱 의존성을 그대로 이동.

- `name`: `@tooday/web`
- `private`: true
- `type`: `module`
- `dependencies`: TanStack 패키지들, react, react-dom, lucide-react, nitro
- `devDependencies`: vite, @vitejs/plugin-react, @types/*, vitest, jsdom, testing-library 관련
- `dependencies`에 `@tooday/shared`: `workspace:*` 추가
- 스크립트:
  - `dev`: `vite dev --port 3000`
  - `build`: `vite build`
  - `test`: `vitest run`
  - `typecheck`: `tsc --noEmit`

### `apps/bff/package.json`

최소 스텁 (tRPC 셋팅 시 확장):

```json
{
  "name": "@tooday/bff",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@tooday/shared": "workspace:*"
  }
}
```

스크립트, 엔트리, tsconfig 모두 없음. 디렉토리 placeholder.

### `packages/shared/package.json`

빌드 없는 소스 직접 익스포트:

```json
{
  "name": "@tooday/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

`packages/shared/src/index.ts`:

```ts
export {}
```

## TypeScript 설정

### `tsconfig.base.json` (루트)

기존 `tsconfig.json`의 공통 컴파일러 옵션을 그대로 추출. 모든 패키지가 extends.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "react-jsx",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  }
}
```

웹 전용인 `types: ["vite/client"]`와 `paths`는 베이스에서 제외 — 각 패키지의 tsconfig에서 추가.
`include`/`exclude`도 베이스에 두지 않음 (각 패키지에서 결정).

### `apps/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

별칭은 `@/*`만 사용 (기존 `#/*`는 제거). 기존 `package.json`의 `imports` 필드도 함께 제거 — Vite의 `resolve.tsconfigPaths`가 tsconfig 경로를 그대로 해석한다.

### `packages/shared/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

베이스에 이미 `noEmit: true`가 있으므로 별도 지정 불필요.

### `apps/bff`

TS 파일 없음 → tsconfig 없음. tRPC 셋팅 시 추가.

## Turborepo 파이프라인

### `turbo.json`

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": {
      "dependsOn": ["^build"],
      "inputs": [
        "src/**",
        "public/**",
        "vite.config.ts",
        "tsconfig.json",
        "package.json",
        "$TURBO_ROOT$/tsconfig.base.json"
      ],
      "outputs": [".output/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": [
        "src/**",
        "tsconfig.json",
        "package.json",
        "$TURBO_ROOT$/tsconfig.base.json"
      ]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "inputs": [
        "src/**",
        "tsconfig.json",
        "package.json",
        "$TURBO_ROOT$/tsconfig.base.json"
      ]
    }
  }
}
```

`inputs`로 캐시 키를 명시 → 무관한 파일 변경에 캐시 무효화 방지. 베이스 tsconfig는 `$TURBO_ROOT$` 토큰으로 루트 참조.

### Biome는 turbo 우회

Biome는 자체적으로 워크스페이스 전체를 한 번에 처리하므로 turbo 파이프라인에 넣지 않고 루트에서 직접 실행한다 (`bun run lint`, `bun run check`, `bun run format`).

## 개발 도구 호이스팅 원칙

- **루트**: `typescript`, `@biomejs/biome`, `turbo`
- **각 워크스페이스**: 해당 앱/패키지 전용 도구 (예: `vite`, `vitest`, `@vitejs/plugin-react`는 `apps/web` 전용)

## 마이그레이션 영향

- 현재 `tooday/src/`, `tooday/public/`, `tooday/.tanstack/`, `tooday/vite.config.ts` → `apps/web/`로 이동
- 현재 `tooday/package.json`의 앱 의존성 → `apps/web/package.json`로 이동
- 현재 `tooday/tsconfig.json` → 공통 컴파일러 옵션은 `tsconfig.base.json`로, 웹 전용 옵션(`types`, `paths`)과 `include`는 `apps/web/tsconfig.json`로 분리
- 별칭 `#/*` 제거 (현재 소스 코드에서 사용처 없음). `@/*`만 유지.
- 기존 `node_modules/`와 `bun.lockb` 삭제 후 루트에서 `bun install` 재실행 (워크스페이스 단일 lockfile 재생성)
- `.gitignore` 업데이트: `**/node_modules`, `**/.turbo`, `apps/*/dist`, `apps/*/.output`, `apps/*/.tanstack` 등 추가
- biome.json의 `files.includes`가 모노레포 구조에 맞는지 확인 (필요 시 `apps/**`, `packages/**` 포함하도록 조정)

## 비목표 (YAGNI)

- bff 실제 구현 (tRPC) — 별도 후속 작업
- shared 패키지의 빌드 산출물 (현재는 소스 직접 익스포트)
- shared에 실제 타입 정의 — bff 셋팅 시 함께 추가
- ESLint/Prettier — Biome로 통일된 상태 유지
- Changesets/버전 관리 — 내부 전용 (`private: true`)이므로 불필요
