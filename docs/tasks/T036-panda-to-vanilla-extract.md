# T036 — Panda CSS → vanilla-extract 마이그레이션

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-08-01
- 완료: 2026-08-01

## 배경

apps/web의 스타일 시스템이 Panda CSS(`@pandacss/dev`)로 구성돼 있다.
- `apps/web/panda.config.ts` — 토큰(colors/spacing/radii/shadows/sizes/durations/easings/
  zIndex/fonts/letterSpacings), semanticTokens, textStyles, keyframes, globalCss,
  conditions(press/hover/on), 18개 config recipe 등록, staticCss.
- `apps/web/recipes/*.ts` — 18개 `defineRecipe` (app-bar/base-button/bottom-sheet/card/
  chip/divider/dot/field/input/progress-bar/row/screen/section/spinner/stack/surface/
  tab-bar/text).
- `styled-system/*`(gitignore, `panda codegen` 산출물)을 `css()`/`cva()`/`cx()`/`token()` +
  `styled-system/recipes`로 소비하는 소스 32개(shared/ui 20 + features 12).
- `apps/web/src/app/global.css`는 `@layer` 선언만, 실제 규칙은 Panda가 주입.

design-guide는 이미 `@vanilla-extract/*`를 의존에 두고 있어(플러그인만 설치·미사용)
스택 방향이 vanilla-extract로 정렬돼 있다.

## 작업 내용

Panda 구성을 **동작이 동일한** vanilla-extract 구성으로 이관한다.

- `src/styles/` 신설:
  - `theme.css.ts` — `createGlobalTheme(':root', ...)`로 토큰을 CSS 변수로 방출.
    semanticTokens는 참조를 리터럴 값으로 해석해 단일 계약(`vars`)으로 평탄화.
  - `text-styles.ts` — Panda `textStyle`을 스타일 객체 맵으로.
  - `conditions.ts` — press/hover/on/focusVisible 등 조건을 vanilla-extract selector로.
  - `keyframes.css.ts` — toodaySpin/FadeIn/SlideUp.
  - `global.css.ts` — preflight 대체 리셋 + 기존 globalCss를 `globalStyle`로.
  - `recipe.ts`/`cx.ts` — `@vanilla-extract/recipes` 재노출 + `cx`/`splitVariantProps` 헬퍼.
- 18개 recipe를 `@vanilla-extract/recipes`의 `recipe()`로 이관(각 컴포넌트 옆 `*.css.ts`).
  variant CSS 전량 생성(=staticCss 등가)은 recipe의 기본 동작.
- `css()`/`cva()` 모듈 상수를 컴포넌트별 `*.css.ts`로 이관, tsx는 import만.
- `token('colors.x')` → `vars.color.x`(런타임 var 문자열).
- vite.config에 `vanillaExtractPlugin()` 추가, `panda codegen`/`styled-system` 배선 제거,
  `@pandacss/dev` 제거, `@vanilla-extract/*` 추가.

기각한 대안: styled-system 클래스명까지 1:1 재현 — 불필요(클래스명은 내부 표현).
동일성 기준은 최종 계산 스타일과 인터랙션 동작.

## 완료 기준

- [x] `@pandacss/dev`·`panda.config.ts`·`styled-system`·postcss.config 참조 전부 제거
- [x] 18 recipe + 32 소비처가 vanilla-extract로 이관
- [x] typecheck 통과 (web + 전체 워크스페이스)
- [x] build 통과 (레이어 순서 reset<base<tokens<recipes<utilities 확인)
- [x] test 통과 (24 passed)
- [x] biome check / lint:deps 통과

## 대화 기록

> **사용자**: 지금 판다로 구성된것을 완전히 동일한 코드로 바닐라익스트렉으로 마이그레이션해봐

## 작업 로그

- 2026-08-01: 조사 — Panda 사용 범위(panda.config, 18 recipe, 32 소비처) 매핑.
  `@vanilla-extract/css@1.20.1`·`vite-plugin@5.2.2`·`recipes@0.5.7`를 web에 추가.
- 2026-08-01: 이관 완료.
  - `src/styles/` 신설: `theme.css.ts`(createGlobalTheme로 토큰·semanticTokens를 CSS 변수화),
    `text-styles.ts`, `conditions.ts`(hover/press/on/focusVisible selector), `layers.css.ts`
    (recipes/utilities 레이어 래퍼 `rec`/`util`), `cx.ts`, `split.ts`(splitVariantProps).
  - 18 recipe + cva(button/tab-bar/color-swatch/task-card/week-strip)를 `@vanilla-extract/recipes`
    `recipe()`로, `css()` 상수를 컴포넌트별 `*.css.ts`로 이관. `token()` → `vars.*`.
  - `global.css`를 preflight(reset 레이어) + globalCss(base 레이어) + keyframes로 재작성.
    레이어 순서는 `__root.tsx` `<head>` 최상단 인라인 `<style>`로 확정(스타일시트 주입 순서 무관).
  - vite.config에 `vanillaExtractPlugin()` + `.css.ts` 라우트 제외. panda.config.ts·recipes/·
    styled-system·postcss.config.cjs·`@pandacss/dev`·`prepare` 스크립트 제거, tsconfig/webpack.depcruise
    별칭 정리.
  - 검증: typecheck(4패키지)·build·test(24)·biome check·lint:deps 모두 통과.
    globalLayer는 rolldown-vite에서 fileScope 오류가 나 문자열 레이어명으로 우회.
