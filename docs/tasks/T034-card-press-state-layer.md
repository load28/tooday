# T034 — 카드 press 피드백을 scale에서 state-layer로

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-28
- 완료: 2026-07-28

## 배경

프로젝트 카드·상세의 태스크 카드를 클릭하는 순간 "너비가 줄었다 커진다"는 현상.
**실측(agent-browser, viewport 1280)** 으로 근본 원인 확정:

| 상태 | 시각적 폭 | transform |
|---|---|---|
| 평상시 | 1248px | none |
| 누름(`data-pressed`) | 1235.52px | matrix(0.99) |
| 차이 | **−12.48px** | scale(0.99) |

- 원인: `recipes/card.ts`의 `interactive` variant `_press: { transform: 'scale(0.99)' }`.
  카드가 `width:100%`라 scale은 폭에 **비례** → 데스크톱 1248px에선 12.5px 점프.
- 이 브라우저는 오버레이 스크롤바(폭 0px)로 측정됨 → 스크롤바 가설 기각. transform이 원인.
- **Today가 멀쩡한 이유**: `TaskCard`는 바깥 `Card`에 `interactive`가 없고(scale 없음),
  클릭 요소가 plain `BaseButton`(pressed variant 미적용)이라 transform이 전혀 없다.

### 왜 state-layer가 표준인가 (기술조사)

웹뷰를 **모바일+데스크톱 둘 다** 쓰므로 크기 무관·포인터 hover까지 되는 방식이 필요.

- **Material 3 State Layers**: hover/focus/pressed는 콘텐츠 색의 **반투명 오버레이(불투명도)**.
  크기 무관.
- **iOS HIG (Lists)**: 탭 시 **행 전체 배경 하이라이트**(포커스 링 아님).
- **prefers-reduced-motion**: transform/scale은 줄이거나 제거하고 **색/페이드**로 대체.
- scale 변형은 작은 개별 버튼엔 적합하나 전체폭 표면엔 부적합(비례 확대).

코드베이스에 이미 유사 패턴 존재: `recipes/row.ts` `interactive`의 `_press: { bg: 'pressedStrong' }`.

### state-layer 색·불투명도 산정 방법 (표준 → 우리 값 유도)

기존 `pressed`/`pressedStrong`를 그냥 재사용하지 않고 표준 방법으로 유도한다:

- **색 = 콘텐츠(on-surface) 색**. state layer는 "on-color를 상태별 불투명도로" 얹는다(임의 색 X).
  → 우리 콘텐츠 색 = `text` = `cool.900`(#191f28). 기존 `pressed`의 `rgba(15,19,36)`는 그림자용
  ink라 **콘텐츠 색이 아님 → 방법론상 오류**. `text`로 바로잡는다.
- **불투명도 = 상태별 고정 스케일** (Material 3): hover 8% · focus 10% · pressed 10% · dragged 16%.
  우리는 hover 8%, press 10%만 쓴다(focus는 링/boxShadow로 이미 처리, drag 없음 → 생략).
- **표현**: `text`를 단일 출처로 묶는 `color-mix`:
  - `stateHover:   color-mix(in srgb, {colors.text} 8%, transparent)`
  - `statePressed: color-mix(in srgb, {colors.text} 10%, transparent)`
- 미사용 `pressed`(0.06) 제거, `pressedStrong`(0.10) 사용처(Row)는 `statePressed`로 이관.

## 작업 내용

- **토큰(panda.config)**: 위 유도대로 `stateHover`/`statePressed`를 semanticTokens에 추가,
  미사용 `pressed`·`pressedStrong` 제거.
- **`recipes/card.ts` `interactive`**: scale 제거 → **`::before` state-layer 오버레이**.
  카드 base가 불투명 `bg:surface`라 Row처럼 bg만 바꾸면 배경이 사라지므로, 크기 무관
  오버레이를 얹는다(Material 실제 방식). `position:relative` + `overflow:hidden`(base)로 라운드
  클리핑. `_hover → stateHover`(데스크톱 포인터), `_press → statePressed`(터치/클릭).
  base의 vestigial `_press:{transitionDuration:0}`와 transform 트랜지션은 정리.
- **`recipes/row.ts` `interactive`**: `_hover: { bg: 'stateHover' }` 추가, `_press`를
  `statePressed`로 이관.
- **reduced-motion**: scale→색 트랜지션 전환 자체가 reduced-motion 친화(transform 없음)라
  별도 가드 불필요.
- 파급: `Card interactive` 사용처(projects 카드, detail 태스크 카드, task-fields 3곳)가 전부
  표준 state-layer로 수렴.

**검증**: agent-browser로 press 전후 폭 동일(scale 제거 확인) + hover/press 틴트 육안 확인.

### 스코프에서 뺀 것 (후속)

- **Today `TaskCard` 행 하이라이트**: Today는 이 버그가 없다. 게다가 카드 안에 버튼이 둘
  (본문 내비 + 체크박스 토글)이라 "행 전체 하이라이트"를 깨끗이 얹으려면 TaskCard 구조 손질
  (`:has()` 등)이 필요하다. 버그 없는 화면의 구조 변경을 버그 수정 커밋에 섞지 않고 **별도
  태스크로 분리**한다(작고 검증 가능한 커밋 유지).

## state layer 공유 원칙 (구현 중 Minyoung 질문에서 확정)

state layer 색 = **그 요소 자신의 콘텐츠 색**이므로, 같은 표면·콘텐츠 맥락일 때만 토큰을 공유한다:
- **중립(어두운 글자·밝은 표면)** — 카드·Row·ghost 버튼 → `stateHover`/`statePressed` 공유 O.
- **채움 버튼(primary/danger)** — 콘텐츠가 흰 글자·유색 배경이라 눌림 색이 "자기 색의 진한 버전"
  (`primaryPressed`/`dangerPressed`). 중립 state 토큰과 **공유하지 않는 게 맞음**.

즉 `state*`는 사실상 "중립(on-surface) state layer"다.

## 완료 기준

- [x] `Card interactive` press 시 폭 변화 0 (agent-browser 실측: 1248→1248, transform none)
- [x] 카드 press 시 state-layer 틴트 = `color(srgb … / 0.1)` (콘텐츠 ink × 10%) 실측
- [x] `Row interactive` hover/press를 state 토큰으로 이관
- [x] typecheck(직접 tsc) 통과, `panda codegen` 정상, 웹 테스트 24 passed, biome 통과

## 대화 기록

> **Minyoung**: 프로젝트 리스트와 프로젝트의 태스크 리스트를 각각 클릭하는 순간 너비가
> 줄었다가 다시 커진다. 이 현상에 대해서 분석해보자 → (측정) → 왜 Today는 안 그런지 궁금,
> 문제면 기술조사로 표준 검토 → 웹뷰라 모바일·데스크톱 둘 다 고려 → 진행하자
>
> **Claude**: 실측으로 scale(0.99) 원인 확정. Today는 interactive/pressed 미적용이라 무관.
> 표준은 state-layer(Material)·행 하이라이트(iOS)이고 크기 무관이라 모바일·데스크톱 모두 적합.
> Card interactive를 state-layer로 전환 + Row hover 패리티로 진행(Today는 후속).

## 작업 로그

- 2026-07-28: 태스크 생성. 구현. panda.config에 `stateHover`/`statePressed`
  (`color-mix(in srgb, {colors.text} 8%/10%, transparent)`) 추가, 미사용 `pressed`·
  `pressedStrong` 제거. `card.ts` interactive: scale → `::before` state layer(+position
  relative), `row.ts`: state 토큰으로 이관 + hover 추가. `button.tsx` ghost가 `pressedStrong`을
  쓰던 걸 놓쳤다가(초기 grep이 `_press:` 줄을 필터로 걸러 오탐 — Minyoung "버튼과 카드 공유"
  질문에서 발견) `statePressed`로 수정. baseButton의 scale(0.96) pressed variant는 미사용(무관).
  검증: agent-browser 실측(폭 점프 0 + state layer 색 확인), 직접 tsc, 웹 테스트 24 passed,
  biome 클린. styled-system은 gitignored라 커밋 제외.
  참고: 실측용 dev 계정(layout-debug@tooday.app)+프로젝트 잔존 → PGlite 리셋으로 정리 가능.
- 2026-07-28(후속): 데스크톱 검토 — hover 8%가 큰 카드에서 진하고, 리플이 없어 press(10%)와
  위계가 거의 안 갈렸다. 기술조사로 대조(MUI 데스크톱 hover 4% vs M3 8%) 후 `stateHover`를
  8%→**5%**로 낮춤(press 10% 유지). hover는 데스크톱 전용이라 모바일 웹뷰엔 영향 0.
  브라우저 실측: stateHover=`…/0.05`, statePressed=`…/0.1` 확인. typecheck·biome 통과.
