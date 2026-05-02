# Monorepo Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단일 TanStack Start 앱을 Turborepo + bun workspaces 모노레포로 재구성한다 (`apps/web`, `apps/bff` 스텁, `packages/shared`).

**Architecture:** 루트는 워크스페이스 매니페스트 + 공통 도구만 보유. 기존 앱은 `apps/web`로 통째로 이동. `packages/shared`는 빌드 없이 TS 소스를 직접 익스포트(`exports: { ".": "./src/index.ts" }`). `apps/bff`는 패키지 스텁만 둠. Turbo는 `dev`/`build`/`test`/`typecheck`만 오케스트레이션하고, Biome는 루트에서 직접 실행.

**Tech Stack:** Bun (workspaces, lockfile), Turborepo, TypeScript, Vite, TanStack Start, Biome.

**Reference Spec:** `docs/superpowers/specs/2026-05-02-monorepo-design.md`

---

## File Structure (Target)

```
tooday/
├── apps/
│   ├── web/                        # 기존 앱 이동
│   │   ├── src/                    # 이동
│   │   ├── public/                 # 이동
│   │   ├── .tanstack/              # 이동
│   │   ├── vite.config.ts          # 이동
│   │   ├── tsconfig.json           # NEW
│   │   └── package.json            # NEW
│   └── bff/
│       └── package.json            # NEW (스텁)
├── packages/
│   └── shared/
│       ├── src/index.ts            # NEW (빈 barrel)
│       ├── tsconfig.json           # NEW
│       └── package.json            # NEW
├── docs/                           # 변경 없음
├── package.json                    # 재작성 (워크스페이스 루트)
├── turbo.json                      # NEW
├── tsconfig.base.json              # NEW (현재 tsconfig 컴파일러 옵션 추출)
├── tsconfig.json                   # 삭제
├── biome.json                      # 변경 없음 (현재 includes 패턴이 모노레포 호환)
├── bun.lockb                       # 재생성
├── .gitignore                      # 업데이트
├── .cta.json                       # 변경 없음
└── README.md                       # 변경 없음
```

이동 대상이 아닌 루트 잔류물: `biome.json`, `.cta.json`, `.gitignore`, `README.md`, `.idea/`, `.vscode/`, `docs/`.

---

## Task 1: 루트 `tsconfig.base.json` 생성

**Files:**
- Create: `tsconfig.base.json`

- [ ] **Step 1: 베이스 tsconfig 작성**

`tsconfig.base.json`:

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

- [ ] **Step 2: 커밋**

```bash
git add tsconfig.base.json
git commit -m "chore: add tsconfig.base.json for monorepo"
```

---

## Task 2: 루트 `turbo.json` 생성

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: turbo 파이프라인 작성**

`turbo.json`:

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".output/**", ".tanstack/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add turbo.json
git commit -m "chore: add turbo.json pipeline"
```

---

## Task 3: `packages/shared` 패키지 생성

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p packages/shared/src
```

- [ ] **Step 2: `packages/shared/package.json` 작성**

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

- [ ] **Step 3: `packages/shared/tsconfig.json` 작성**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 4: `packages/shared/src/index.ts` 작성**

```ts
export {}
```

- [ ] **Step 5: 커밋**

```bash
git add packages/shared
git commit -m "feat: scaffold @tooday/shared package"
```

---

## Task 4: `apps/bff` 스텁 생성

**Files:**
- Create: `apps/bff/package.json`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p apps/bff
```

- [ ] **Step 2: `apps/bff/package.json` 작성**

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

스크립트, 엔트리, tsconfig 모두 없음 (추후 tRPC 셋팅 시 추가).

- [ ] **Step 3: 커밋**

```bash
git add apps/bff
git commit -m "feat: scaffold @tooday/bff stub"
```

---

## Task 5: 기존 웹 자산을 `apps/web`로 이동

**Files:**
- Move: `src/` → `apps/web/src/`
- Move: `public/` → `apps/web/public/`
- Move: `.tanstack/` → `apps/web/.tanstack/`
- Move: `vite.config.ts` → `apps/web/vite.config.ts`

- [ ] **Step 1: `apps/web` 디렉토리 생성**

```bash
mkdir -p apps/web
```

- [ ] **Step 2: 파일/디렉토리 이동 (git이 rename 추적)**

```bash
git mv src apps/web/src
git mv public apps/web/public
git mv vite.config.ts apps/web/vite.config.ts
```

`.tanstack/`은 Git 추적 대상이 아니므로 `mv` 사용:

```bash
mv .tanstack apps/web/.tanstack
```

- [ ] **Step 3: 이동 결과 확인**

```bash
ls apps/web
```

Expected: `.tanstack`, `public`, `src`, `vite.config.ts` 표시.

- [ ] **Step 4: 커밋**

`.tanstack/`은 `.gitignore`로 추적 대상이 아니므로 staged 변경만 커밋:

```bash
git add apps/web
git commit -m "refactor: move web assets to apps/web"
```

---

## Task 6: `apps/web/package.json` 작성

**Files:**
- Create: `apps/web/package.json`

- [ ] **Step 1: 웹 패키지 매니페스트 작성**

`apps/web/package.json`:

```json
{
  "name": "@tooday/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 3000",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-devtools": "latest",
    "@tanstack/react-router": "latest",
    "@tanstack/react-router-devtools": "latest",
    "@tanstack/react-router-ssr-query": "latest",
    "@tanstack/react-start": "latest",
    "@tanstack/router-plugin": "^1.132.0",
    "@tooday/shared": "workspace:*",
    "lucide-react": "^0.545.0",
    "nitro": "npm:nitro-nightly@latest",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@tanstack/devtools-vite": "latest",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^22.10.2",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.0.1",
    "jsdom": "^28.1.0",
    "vite": "^8.0.0",
    "vitest": "^4.1.5"
  }
}
```

기존 루트 `package.json`에서 가져온 항목 그대로. `imports` 필드는 의도적으로 제거(별칭은 tsconfig paths의 `@/*`만 사용).

- [ ] **Step 2: 커밋**

```bash
git add apps/web/package.json
git commit -m "feat: add @tooday/web package manifest"
```

---

## Task 7: `apps/web/tsconfig.json` 작성

**Files:**
- Create: `apps/web/tsconfig.json`

- [ ] **Step 1: 웹 tsconfig 작성**

`apps/web/tsconfig.json`:

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

- [ ] **Step 2: 커밋**

```bash
git add apps/web/tsconfig.json
git commit -m "feat: add apps/web tsconfig"
```

---

## Task 8: 루트 `package.json` 워크스페이스 루트로 재작성

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 루트 매니페스트 교체**

`package.json` 전체를 다음으로 교체:

```json
{
  "name": "tooday",
  "private": true,
  "type": "module",
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
    "turbo": "latest",
    "typescript": "^6.0.2"
  }
}
```

기존에 있던 앱 의존성, `imports` 필드, `pnpm.onlyBuiltDependencies` 항목 모두 제거.

- [ ] **Step 2: 커밋**

```bash
git add package.json
git commit -m "refactor: convert root package.json to workspace root"
```

---

## Task 9: 루트 `tsconfig.json` 삭제

**Files:**
- Delete: `tsconfig.json`

- [ ] **Step 1: 루트 tsconfig 삭제**

```bash
git rm tsconfig.json
```

루트는 `tsconfig.base.json`만 보유. 패키지별 tsconfig가 이를 extends.

- [ ] **Step 2: 커밋**

```bash
git commit -m "chore: remove obsolete root tsconfig.json"
```

---

## Task 10: `.gitignore` 업데이트

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 모노레포용 패턴 추가**

`.gitignore` 전체를 다음으로 교체:

```
**/node_modules
.DS_Store
**/dist
**/dist-ssr
*.local
.env
**/.nitro
**/.tanstack
**/.wrangler
**/.output
.vinxi
__unconfig*
todos.json
.turbo
**/.turbo
```

- [ ] **Step 2: 커밋**

```bash
git add .gitignore
git commit -m "chore: update .gitignore for monorepo paths"
```

---

## Task 11: 의존성 재설치 (단일 lockfile 재생성)

**Files:**
- Delete: `node_modules/`
- Delete: `bun.lockb`
- Create: `bun.lockb` (재생성)
- Create: `apps/web/node_modules/`, `packages/shared/node_modules/` 등 (자동)

- [ ] **Step 1: 기존 설치 산출물 제거**

```bash
rm -rf node_modules bun.lockb
```

- [ ] **Step 2: 워크스페이스 재설치**

```bash
bun install
```

Expected: 출력에 워크스페이스 3개(`@tooday/web`, `@tooday/bff`, `@tooday/shared`)가 인식되고, 단일 `bun.lockb`가 루트에 생성됨.

- [ ] **Step 3: 커밋**

```bash
git add bun.lockb
git commit -m "chore: regenerate bun.lockb for workspaces"
```

---

## Task 12: 검증 — typecheck

**Files:** (변경 없음)

- [ ] **Step 1: 타입체크 실행**

```bash
bun run typecheck
```

Expected:
- Turbo가 `@tooday/web`와 `@tooday/shared`의 `typecheck` 태스크를 실행.
- `tsc --noEmit`이 두 패키지 모두에서 오류 0건으로 통과.

오류가 발생하면 패키지별 tsconfig의 `extends` 경로 또는 `paths`/`types` 설정을 점검.

---

## Task 13: 검증 — build

**Files:** (변경 없음)

- [ ] **Step 1: 빌드 실행**

```bash
bun run build
```

Expected:
- Turbo가 `@tooday/web`의 `build`만 실행 (다른 패키지엔 `build` 스크립트 없음).
- `vite build`가 성공하고 `apps/web/.output/` 또는 `apps/web/dist/` 산출물 생성.

---

## Task 14: 검증 — dev 서버

**Files:** (변경 없음)

- [ ] **Step 1: 개발 서버 시작**

```bash
bun run dev
```

Expected:
- 콘솔에 `Local: http://localhost:3000/` 출력.
- 브라우저에서 접속 시 "Welcome to TanStack Start" 페이지 정상 표시.

- [ ] **Step 2: 서버 종료**

`Ctrl+C`로 종료.

- [ ] **Step 3: 검증 통과 시 마무리 커밋 (선택)**

검증 단계는 코드 변경이 없으므로 별도 커밋 불필요. 만약 검증 중 사소한 수정이 발생했다면 해당 변경만 커밋.

---

## Self-Review Notes

- 모든 단계의 코드 블록은 그대로 붙여넣기 가능한 완전한 형태로 작성됨.
- 별칭 정책: `@/*`만 사용. `package.json`의 `imports` 필드는 web 매니페스트에서 의도적으로 제외됨 (Spec 결정).
- Biome 설정(`biome.json`)은 현재 `**/src/**/*` 패턴이 모노레포 구조와 그대로 호환되어 수정 불필요.
- `node_modules`/`bun.lockb` 재생성은 워크스페이스 호이스팅을 위해 필수.
- 검증 태스크는 TDD가 아닌 통합 검증(typecheck/build/dev)으로 구성됨 — 이 마이그레이션은 비즈니스 로직 변경이 없는 구조 재배치 작업이기 때문.
