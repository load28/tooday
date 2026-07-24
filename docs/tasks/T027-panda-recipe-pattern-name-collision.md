# T027 — Panda 커스텀 레시피가 내장 패턴 이름과 충돌 (config 경고)

- 상태: 진행중 <!-- 대기 | 진행중 | 완료 · 코드 완료·커밋 대기 -->
- 생성: 2026-07-24
- 완료: -
- 커밋: -

## 배경

web dev 기동 시 Panda가 매번 경고를 낸다.

```
🐼 warn [config] ⚠️ Invalid config:
- [recipes] This recipe name is already used in `patterns`: `divider`
- [recipes] This recipe name is already used in `patterns`: `stack`
- [recipes] This recipe name is already used in `patterns`: `spacer`
```

- 원인: `apps/web/recipes/{stack,divider}.ts`가 `stack`·`spacer`·`divider` **레시피**를
  정의하고 `panda.config.ts`에 등록하는데, 이 세 이름은 Panda 내장 preset-base의
  **패턴** 이름과 그대로 겹친다. Panda가 한 이름이 recipe·pattern 양쪽에 매핑돼
  모호하다고 경고한다.
- 기능 영향은 없다(확인함): `styled-system/recipes/{stack,divider,spacer}`가 정상
  생성되고, 소비처는 `src/shared/ui/stack.tsx`·`divider.tsx`가 `styled-system/recipes`에서
  **명시적으로** import하므로 레시피가 쓰인다. 앱은 `styled-system/patterns`를
  전혀 import하지 않는다.
- 즉 이름 충돌은 이 프로젝트가 싫어하는 "드리프트"의 일종 — 같은 이름이 두 곳에
  존재. 경고 노이즈로 남고, `styled-system/jsx`에서 `<Stack>` 등 모호성의 씨앗이 된다.

## 작업 내용

`panda.config.ts`에 `config:resolved` 훅을 추가해 충돌하는 내장 패턴 세 개만
resolved config에서 제거한다(레시피 이름·소비 코드는 그대로).

```ts
hooks: {
  'config:resolved': ({ config, utils }) =>
    utils.omit(config, ['patterns.stack', 'patterns.spacer', 'patterns.divider']),
},
```

- 근거: Panda 공식 문서(concepts/hooks — "Modifying Resolved Configuration",
  concepts/extend). ✅ 내장 패턴 개별 제거의 정식 방법.
- 기각한 대안 1: 레시피 세 개를 비충돌 이름으로 rename. `shared/ui` 소비처까지
  퍼지는 API 변경이라 config-only 해법보다 무겁다.
- 기각한 대안 2: `eject: true` + 나머지 패턴 재등록. preset-base 전체를 떼내야 해
  과하다. `hstack`/`vstack` 등 충돌하지 않는 패턴은 그대로 둔다.

## 조사 결과 (2026-07-24) — config 훅으로는 경고 제거 불가

`config:resolved` 훅(반환·mutation 양쪽)을 실제로 붙여 `panda codegen`으로 검증함:

- mutation(`delete config.patterns.stack/spacer/divider`)은 **출력의 패턴은 제거**한다.
  → `styled-system/patterns/index.mjs`가 `hstack`/`vstack`만 export (실 충돌/드리프트 해소).
- 그러나 **경고 문구는 그대로 남는다.** 검증(validation) 경고가 `config:resolved`
  훅보다 **먼저** 계산되기 때문. 즉 훅으론 사용자가 보는 경고를 못 없앤다.
- 반환값 방식(`return utils.omit(...)`)은 1.11.1에서 출력에 반영조차 안 됐다.

→ 실험 훅은 원복함. 경고를 근원에서 없애려면 이름 충돌 자체를 제거해야 한다.

## 방향 (결정 대기)

1. **레시피 rename (권장):** `stack`/`spacer`/`divider` 레시피를 내장 패턴과 안 겹치는
   이름으로 변경. 파급은 `panda.config.ts` + `recipes/{stack,divider}.ts` +
   소비처 `src/shared/ui/{stack,divider}.tsx` 2파일로 국한(`staticCss`·`theme.recipes`는
   `Object.keys(uiRecipes)` 파생이라 자동). 경고가 근원에서 사라지고 검증도 유지.
2. **그대로 둠:** 경고는 무해(레시피 정상, 앱은 recipes 명시 import). 노이즈만 감수.
3. **`validation: 'none'`:** 모든 config 검증 끔. 이 경고 외 유용한 검증까지 잃어 비권장.

## 완료 기준 (rename 채택 — `t` 프리픽스)

- [x] `panda codegen`이 세 경고 없이 통과한다.
- [x] 레시피는 `tStack`/`tSpacer`/`tDivider`로 생성되고 `shared/ui` 소비처가 갱신된다.
- [x] web typecheck 통과.

## 대화 기록

> **사용자**: (web dev 로그 붙여넣음) `🐼 warn [config] ⚠️ Invalid config: - [recipes]
> This recipe name is already used in `patterns`: `divider` / `stack` / `spacer``
>
> **Claude**: 커스텀 레시피 3개가 Panda 내장 패턴과 이름이 겹쳐 나는 경고다.
> 기능 문제는 없고(레시피는 정상 생성·명시 import), 이름 충돌 위생 문제다. Panda
> 정식 방법인 `config:resolved` 훅으로 충돌 패턴만 제거해 config-only로 해소한다.
>
> **Claude**(조사 후): 훅은 출력의 충돌 패턴은 지우나 검증 경고가 훅보다 먼저 돌아
> 경고 문구를 못 없앤다. 근원 제거는 rename뿐이라 방향을 물음.
>
> **사용자**: (rename 선택) 프리픽스를 다른 것으로 → `t (tooday)` 선택.
>
> **Claude**: `stack`/`spacer`/`divider` 레시피를 `tStack`/`tSpacer`/`tDivider`로
> rename. className·variant·React 컴포넌트 이름(Stack/HStack/Spacer/Divider)은 유지.

## 작업 로그

- 2026-07-24: 원인 규명 + config 훅 검증. `config:resolved` mutation은 출력의 충돌
  패턴은 제거하나 검증 경고는 훅보다 먼저 계산돼 못 지운다는 것을 codegen으로 확인.
  실험 훅 원복. 경고 근원 제거는 레시피 rename 필요 — 방향 사용자 결정 대기.
- 2026-07-24: `t` 프리픽스로 rename 확정·구현. `recipes/{stack,divider}.ts` export,
  `panda.config.ts` import·등록, 소비처 `shared/ui/{stack,divider}.tsx`(type 포함) 갱신.
  검증 — `panda codegen --clean` 경고 0, `styled-system/recipes`가 `t-stack/t-spacer/t-divider`
  생성, web `tsc --noEmit` exit 0, biome 6파일 clean, vitest 24 pass. 커밋 대기.
