# T024 — 디자인 토큰 위생 (토큰 계층 정합·잔여 매직 값)

- 상태: 대기
- 생성: 2026-07-10
- 완료: -
- 커밋: -

> 근거 경로는 T037(2026-08-02)에서 vanilla-extract 기준으로 재작성했다.
> 원래 근거는 `panda.config.ts:행번호`였으나 T036이 그 파일을 없앴다.
> 발견 자체는 아래 경로에서 재확인한 것만 남겼다.

## 배경

재조사(2026-07-10) 결과 디자인 시스템 컨벤션(recipe 오버라이드 금지, Ark 조립)은
사실상 무위반. 남은 건 토큰 계층 내부의 정합성과 T009가 놓친 매직 값들이다.
모두 `apps/web` 범위 (design-guide는 T014에서 제외 종결).

1. **토큰이 있는데 하드코딩** — `styles/text-styles.ts`가 `letterSpacing`을
   `'-0.01em'/'-0.02em'/'-0.03em'` 리터럴로 쓰는데, 같은 값을 담은
   `vars.letterSpacing.tight/tighter/tightest`(`theme.css.ts:172-176`)가 따로 있다.
   토큰 쪽도 `shared/ui/screen.css.ts:18`·`input.css.ts:31` 2곳에서 쓰여
   **같은 값이 두 표기로 공존**한다. textStyles가 토큰을 참조하게 하거나,
   타이포는 textStyles가 단독 소유임을 정하고 토큰 그룹을 접는다.
2. **팔레트 추적이 끊긴 semantic 값** — T036이 semantic을 리터럴로 평탄화하면서
   각 값에 `// cool.900` 식 출처 주석을 달았는데, `theme.css.ts`의
   `bg: '#f5f6f8'`(42), `bgWarm: '#f7f8fa'`(43), `dangerPressed: '#d63845'`(81)
   **셋만 대응하는 팔레트 단계가 없다**. `ruby.700` 등 단계를 추가해 다른 값과
   같은 추적성을 준다.
3. **중복/미사용 토큰** — `shadow.xs`와 `shadow.sm`이 완전히 같은 값
   (`theme.css.ts:150-151`)인데 `surface.css.ts:38-39`가 둘을 별도 variant로 노출한다
   — 호출자가 고를 수 없는 선택지다. `shadow.fab`/`size.fab`(FAB 없음),
   `size.icon`/`iconLg`(사용처 0, 아이콘은 raw 숫자), `Text`의 `captionStrong`
   variant(정의만 있고 호출처 0)도 함께 본다.
   판단 기준은 "안 쓰여서"가 아니라 **목적이 중복/대체됐는지**다 —
   `shadow.xs`/`sm`은 중복이라 하나로 접고, `fab`류는 목적 자체가 사라졌고,
   `size.icon`/`iconLg`는 목적이 살아있으니(4번) 지우지 말고 연결한다.
4. **잔여 raw 값** — `shared/ui/tab-bar.css.ts:23` `height: '1.75rem'`(width는 토큰),
   `shared/ui/spinner.css.ts:16` `0.6s`(duration 스케일 밖),
   `shared/ui/input.css.ts:28`·`features/today/task-card.css.ts:25`의 `1.5px` 보더
   (borderWidth 토큰 그룹 없음), lucide 아이콘 `size={14|16|18|20|22|36}` raw 숫자
   (`size.icon` 20px·`iconLg` 24px와 불일치 — 최다 사용은 22px).
   auth 화면 `420px`/`clamp(...)`는 T023에서 레이아웃 공통화와 함께 처리.
5. **(결정 사항) 다크 테마 스캐폴딩 부재** — `theme.css.ts`가
   `createGlobalTheme(':root', ...)` 하나로 리터럴을 방출한다. 다크를 넣으려면
   `createThemeContract` + 테마별 구현으로 쪼개야 하고, semantic 계층 전체가
   영향을 받는다. 지금은 지위만 결정해 기록한다
   (라이트 온리 선언 or 스캐폴딩 태스크 분리).

## 작업 내용

토큰 계층 내부 정합(1-3)을 먼저, 그다음 잔여 raw 값(4)을 토큰으로 흡수.
아이콘 사이즈는 공통 상수(또는 Icon 래퍼)로 수렴할지 현장 판단 — 실제 분포가
`size.icon`(20)/`iconLg`(24)와 어긋나므로 토큰 값 쪽을 고치는 선택지도 연다. 5는 결정만.

## 완료 기준

- [ ] textStyles와 `letterSpacing` 토큰 중 한쪽으로 단일화
- [ ] semantic 값이 전부 팔레트 단계로 추적 가능 (주석 또는 참조)
- [ ] 중복 토큰(`shadow.xs`/`sm`) 해소, 목적이 사라진 토큰 정리
- [ ] recipe/피처의 잔여 raw 값 토큰화
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

(2026-08-02, T037 진행 중)

> **사용자**: 지금 ve로 변경했는데 문서나 주석이 그에 맞게 적용되지 않았다. 그것을 적용하자
>
> **Claude**: (T024는 대기 상태인데 근거가 전부 `panda.config.ts` 행번호라
> 착수 불가 상태입니다. 실제 VE 코드에서 각 항목이 아직 유효한지 확인하겠습니다.)

## 작업 로그

- 2026-08-02 (T037): 착수 전 근거만 재작성. T036이 `panda.config.ts`를 없애
  1-5번 항목의 인용 경로가 전부 무효였다. 현재 코드에서 재확인한 결과 —
  1·3·4·5는 유효(경로만 갱신), 2는 T036의 semantic 평탄화로 성격이 바뀌어
  "raw hex 제거"에서 "팔레트 추적성 확보"로 좁혔다.
  1번은 토큰이 미사용이 아니라 **두 표기 공존**임을 확인해 문구를 고쳤다.
  작업 자체는 아직 착수 안 함.
