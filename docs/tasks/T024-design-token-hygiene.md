# T024 — 디자인 토큰 위생 (panda.config 정합·잔여 매직 값)

- 상태: 대기
- 생성: 2026-07-10
- 완료: -
- 커밋: -

## 배경

재조사(2026-07-10) 결과 디자인 시스템 컨벤션(recipe 오버라이드 금지, Ark 조립)은
사실상 무위반. 남은 건 토큰 계층 내부의 정합성과 T009가 놓친 매직 값들이다.
모두 `apps/web` 범위 (design-guide는 T014에서 제외 종결).

1. **토큰이 있는데 하드코딩** — `panda.config.ts`의 `textStyles`(315-439행)가
   `letterSpacing: '-0.02em'/'-0.03em'/'-0.01em'`을 인라인으로 쓰고, 같은 값을
   담은 `letterSpacings.tight/tighter/tightest` 토큰(148-149행)은 미사용으로
   남았다. textStyles가 토큰을 참조하게 하거나 토큰을 삭제.
2. **semantic 토큰의 raw hex** — `bg: '#f5f6f8'`(254), `bgWarm: '#f7f8fa'`(255),
   `dangerPressed: '#d63845'`(290)만 팔레트 참조가 아니다 (`primaryPressed`는
   `{colors.brand.700}` 참조). `ruby.700` 등 팔레트 단계를 추가해 참조로 통일.
3. **중복/미사용 토큰** — `shadows.xs`와 `shadows.sm`이 동일 값(214-215).
   `shadows.fab`/`sizes.fab`(FAB 없음), `sizes.icon`/`iconLg`(아이콘이 raw 숫자
   사용), `captionStrong` textStyle+variant 미사용. 정리 또는 사용처 연결.
4. **잔여 raw 값** — `recipes/tab-bar.ts:17` `height: '1.75rem'`(width는 tapXl
   토큰), `recipes/spinner.ts` `0.6s`(durations 스케일 밖),
   `recipes/input.ts:25`·`features/today/task-card.tsx:29`의 `1.5px` 보더
   (borderWidths 토큰 그룹 없음), lucide 아이콘 `size={16|18|20|22|36}` raw 숫자
   (`sizes.icon`/`iconLg`와 불일치). auth 화면 `420px`/`clamp(...)`는 T023에서
   레이아웃 공통화와 함께 처리.
5. **(결정 사항) 다크 테마 스캐폴딩 부재** — semanticTokens에 `_dark` 조건이
   전혀 없다. 다크 테마 계획이 있으면 semantic 계층 전체에 변형이 필요 —
   지금은 지위만 결정해 기록한다 (라이트 온리 선언 or 스캐폴딩 태스크 분리).

## 작업 내용

panda.config 내부 정합(1-3)을 먼저, 그다음 잔여 raw 값(4)을 토큰으로 흡수.
아이콘 사이즈는 공통 상수(또는 Icon 래퍼)로 수렴할지 현장 판단. 5는 결정만.

## 완료 기준

- [ ] textStyles가 letterSpacings 토큰을 참조 (또는 토큰 삭제)
- [ ] semantic 토큰 raw hex 0건 (팔레트 참조로 통일)
- [ ] 중복·미사용 토큰 정리
- [ ] recipes/피처의 잔여 raw 값 토큰화
- [ ] 다크 테마 지위 결정 기록
- [ ] `bun run typecheck` / `bun run check` 통과, 화면 회귀 없음 (verify 스킬)

## 대화 기록

> **사용자**: 재조사를 하자 기존 14번 미처리로 결론을 내자
>
> **Claude** (디자인 시스템 조사 에이전트 보고 원문, 이 태스크 해당 부분):
>
> The `apps/web` design system is unusually well-disciplined. The two headline
> conventions [중략] are followed essentially everywhere. I found **no clear
> violations** of the recipe-override rule and **no raw `<button>`/`<div
> onClick>`** interactive elements. The findings below are mostly leftover
> magic values, unused tokens, and near-duplicate patterns.
>
> **Tokens defined but hardcoded elsewhere anyway** — the `textStyles` hardcode
> `letterSpacing: '-0.02em'` [중략] instead of referencing the `letterSpacings`
> tokens that hold those exact values.
>
> **Semantic tokens hardcoding hex instead of palette** [중략] **Duplicate
> shadow tokens** [중략] **Unused tokens** [중략] **Remaining raw / magic
> values (T009 leftovers)** [중략] **Semantic-token light/dark gap** [중략]

## 작업 로그

- (없음)
