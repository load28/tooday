# T039 — vanilla-extract → StyleX 전면 전환

- 상태: 진행중 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-09-13
- 완료: -

## 배경

[T038 스파이크](T038-stylex-migration-spike.md)에서 번들러 조합(vite 8 rolldown +
TanStack Start + Nitro)이 `@stylexjs/unplugin@0.19.0`으로 돌고, `BaseButton`·`Button`을
옮긴 결과가 전환 전과 **픽셀 동일**함을 확인했다. 필요한 배선(aliases,
unstable_moduleResolution, devMode css-only, 레이어 자리)도 스파이크에서 다 잡혔다.

남은 것은 나머지 32개 `*.css.ts`(약 1,120줄)를 옮기고 vanilla-extract를 걷어내는 일이다.

전환으로 없어지는 것:

- `styles/layers.css.ts` (`rec`/`baseRec`) — 병합 순서가 `stylex.props()` 인자 순서로 대체된다.
- `styles/cx.ts` — 클래스 문자열을 잇지 않고 스타일 객체 배열을 넘긴다.
- `styles/split.ts` — recipe 런타임이 없으므로 variant prop을 직접 구조분해한다.
- `@vanilla-extract/{css,recipes,vite-plugin}` 의존성.

## 작업 내용

**단계별로 나눠 커밋한다.** 각 단계 끝에서 typecheck / build / test / lint:deps를 돌리고,
화면이 바뀌는 단계는 전환 전 스냅샷과 픽셀 비교한다.

### 1단계 — 토큰·타이포 기반

- `styles/tokens.stylex.ts`를 `theme.css.ts` 전체 계약으로 확장 (color/space/size/radii/
  shadow/duration/easing/letterSpacing/font/zIndex).
- `styles/text-styles.ts`를 `stylex.create` 한 덩어리로 이관 — 스프레드 대신 배열 합성으로 쓴다.
- 이 단계에서는 VE `theme.css.ts`를 아직 지우지 않는다(나머지 파일이 참조 중).

### 2단계 — shared/ui 프리미티브 (20개)

app-bar, bottom-sheet, card, chip, color-swatch, divider, dot, field, input, progress-bar,
row, screen, section, spinner, stack, surface, tab-bar, text.
recipe는 컴포넌트 파일 안 `stylex.create` + 배열 조립으로 바꾸고, prop은 `className` → `sx`.

### 3단계 — features (12개)

auth(login/signup/settings), projects(new-sheet/detail/list), tasks(new/detail/fields),
today(task-card/today-screen/week-strip).

### 4단계 — VE 제거 + 문서 정합

- `styles/theme.css.ts`·`layers.css.ts`·`cx.ts`·`split.ts`·`conditions.ts` 정리,
  `global.css` 레이어 정리, `__root.tsx` 레이어 선언 축소.
- `vite.config.ts`에서 `vanillaExtractPlugin` 제거, package.json에서 VE 3종 제거.
- `docs/conventions/ui-styling.md`·`ui-composition.md`·`README.md` 개정 —
  레이어 규약을 인자 순서 + `StyleXStyles<{...}>` 타입 강제로 바꿔 쓴다.

### 결정된 방향 (T038에서 확정)

- recipe 대체 추상화를 새로 만들지 않는다. 컴포넌트 파일에서 배열을 조립한다.
- override 규율은 `sx?: StyleXStyles<{...}>`로 허용 속성을 좁혀 타입이 막는다.
- Ark 조상 셀렉터(`[data-state="on"] &`)는 `stylex.when.ancestor(...)`로 옮긴다.

## 완료 기준

- [ ] `apps/web/src`에 `*.css.ts`가 남지 않는다 (`global.css`는 리셋 전용으로 유지)
- [ ] `@vanilla-extract/*` 의존성과 vite 플러그인 제거
- [ ] `styles/layers.css.ts`·`cx.ts`·`split.ts` 삭제
- [ ] typecheck / build / test / lint:deps 통과, `bun run check`에 새 지적 없음
- [ ] 주요 화면(`/login`, `/signup`, `/today`, `/projects`, `/tasks/$id`, `/settings`)
      전환 전후 픽셀 비교
- [ ] 컨벤션 문서 3건 개정

## 대화 기록

> **사용자**: 너가 그럼 남은것에 대해 테스트를 해봐
>
> **Claude**: (T038 스파이크 수행 후) 돕니다. 전환 전후 화면이 픽셀 단위로 동일합니다.
> 공식 문서에 없던 배선 세 가지 — aliases + unstable_moduleResolution, dev 모드 수동 주입,
> textStyles 스프레드 불가 — 를 잡았습니다.
>
> **사용자**: ve르ㄹ 왜 남겨두나?
>
> **Claude**: 쓰는 곳이 남아서입니다. 34개 중 2개만 옮겼고 나머지 32개가 아직 VE를
> 임포트합니다. 다만 이미 아무도 안 쓰는 2개는 남길 이유가 없어 지금 지우겠습니다.
>
> **사용자**: 텍스트가 무엇인 문제인데? 동일하게 변경하면 된느거 아님?
>
> **Claude**: 맞습니다, 제가 "설계 숙제"라고 한 건 과장이었습니다 — 똑같이 옮기면 됩니다.
> 문제는 스프레드 문법 하나뿐이고, 타이포도 `stylex.create`로 만들어 배열에서 합치면
> 값·결과가 같습니다.
>
> **사용자**: 그럼 전면적으로 stylex로 변경하도록하자

## 작업 로그

- 2026-09-13: 태스크 생성. 대상 실측 — `*.css.ts` 32개(theme 185줄·layers 15줄 포함 시 34개),
  `cx` 사용 16파일, `theme.css` 참조 33파일, VE recipe 사용 19파일.
- 2026-09-13: 1단계 — tokens.stylex.ts를 theme 전체 계약으로 확장, text.styles.ts 신설.
- 2026-09-13: 2단계 — shared/ui 18개 프리미티브를 StyleX로 이관하고 `*.css.ts`를 모두 제거했다.
  자손 셀렉터 두 곳은 공식 레시피대로 처리 — ColorSwatch Indicator는 `slots.stylex.ts`의
  변수(`swatch.indicatorOpacity`)로, `Screen.Overlay > *`는 global.css의
  `[data-screen-overlay] > *` 한 줄로 옮겼다. Input의 `&&` 스펙시티 트릭은 인자 순서로 대체했다.
  검증 — typecheck/build/test(24)/lint 통과, `/login`·`/today`·`/projects` 픽셀 차이 0,
  `/settings`는 랜덤 이메일 문자열만 다름.
