# T009 — 공유 프리미티브 추출 + 매직 값 토큰화

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-09
- 커밋: (기입 예정)

## 배경

feature 코드에 복붙되었거나 shared/ui로 승격돼야 할 로컬 프리미티브들:

- **borderless 타이틀 input** — `titleInputCls`가 `features/tasks/new-task-screen.tsx:31-41`과
  `task-detail-screen.tsx:30-40`에 byte 동일 복붙. raw `<input>`이 `shared/ui/input.tsx` +
  `recipes/input.ts`가 소유한 리셋·placeholder 처리를 재구현.
- **TabBar 설정** — today/projects 2탭 하단 내비가 `today-screen.tsx`,
  `projects-screen.tsx`, `project-detail-screen.tsx` 3곳에 복붙. `onSelect` 분기가
  화면마다 미묘하게 다름(한쪽만 처리 vs 양쪽 처리).
- **진행률 바** — `projects-screen.tsx:31-42`의 trackCls/fillCls + inline style. 재사용
  프리미티브가 feature에 삶.
- **매직 px** — `60px` 빈 상태 패딩이 3개 화면 중복, `52px`(= `sizes.appBar` 토큰 존재),
  `36px`(= 미사용 `sizes.handle`), `14px`·`48px` 등 스페이싱 스케일 우회.
- `titleDoneCls`(line-through)가 `task-card.tsx:25`와 `project-detail-screen.tsx:44`에 중복.
- `fullWidthCls = css({ width: '100%' })`가 5개 이상 파일에 재정의.

## 작업 내용

1. `Input`에 borderless/inline variant 추가 → 두 화면에서 사용.
2. `AppTabBar`(today/projects 내비 프리셋) 추출 — 자리는 착수 시 결정
   (도메인 라벨이 있으므로 shared/ui보다 entities 또는 features 공용 조립 검토).
3. 진행률 바를 shared/ui 프리미티브로.
4. 매직 px를 기존 토큰으로 치환, 반복되는 값(빈 상태 패딩 등)은 토큰 추가.

## 완료 기준

- [x] 위 중복 항목이 각각 단일 소유처를 가짐
- [x] ui-styling.md 규칙(variant 우선, className은 배치만) 준수
- [x] typecheck / web 테스트 통과, 화면 회귀 없음(/verify 스킬)

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> **7. 공유돼야 할 로컬 프리미티브·설정 중복**
> - borderless 타이틀 `<input>` 스타일이 `new-task-screen.tsx:31`과
>   `task-detail-screen.tsx:30`에 동일 복붙 — `Input`의 variant로 승격 대상.
> - `TabBar` 설정이 3개 화면에 각각 복붙, `onSelect` 분기 로직도 화면마다 미묘하게
>   다름 — `AppTabBar` 추출 대상.
> - `60px` 빈 상태 패딩이 3개 화면 중복, `52px`(= `sizes.appBar` 토큰 존재) 등 매직 px 다수.
> - 프로젝트 진행률 바(`projects-screen.tsx:31`)는 feature에 사는 재사용 프리미티브.
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

(착수 대화, 2026-07-09)

> **사용자**: 남은 태스크중 하나를 진행하자
>
> **Claude**: 남은 태스크 중 우선순위가 가장 높은 T009(공유 프리미티브 추출 + 매직 값
> 토큰화)를 진행. [구현 방향 요약] ① Input `variant="inline"` — box 룩을 variant로
> 분리, ② AppTabBar — 배선 층(routes)의 `-app-tab-bar.tsx`로 추출해 화면에는 `tabBar`
> 슬롯으로 주입, ③ ProgressBar — shared/ui config recipe로, fill 색은 Dot과 동일한
> tone 세트, ④ 토큰화 — `emptyStateY`(60px), `sizes.controlMd`(36px),
> `sizes.timeCol`(52px), Text `strike` variant, Button `fullWidth` variant.

## 작업 로그

### 착수 시 결정 사항

- **AppTabBar 자리 = routes(배선 층).** 검토했던 entities는 "순수 모델·상수·매핑만"
  (web-entities.md)이라 컴포넌트가 못 들어간다. 탭바는 feature 간 내비게이션 조립이므로
  web-entities.md의 "feature 간 UI 조립 → routes가 주입" 규칙과 renderNewProjectSheet
  선례를 따라 `routes/-app-tab-bar.tsx`(`-` 접두사 = 라우트 생성 제외)로 두고, 세 화면은
  `tabBar: ReactNode` 슬롯으로 받는다. 화면마다 미묘하게 다르던 `onSelect` 분기는
  "현재 경로와 다르면 해당 탭 루트로 이동"으로 통일 — 세 화면의 기존 동작을 모두 포함하고,
  프로젝트 상세에서 projects 탭을 누르면 목록으로 올라가는 동작도 유지된다.
- **Input inline variant의 사이즈 충돌은 `&&` 스펙시티로 해결.** 처음엔 size 메트릭을
  compoundVariants(box 전용)로 내리려 했으나 **staticCss가 compound variant CSS를
  생성하지 않아**(usage가 동적이라 정적 추출도 안 됨) box 사이즈가 통째로 사라졌다.
  대신 inline variant가 `'&&'`(클래스 2회 = 스펙시티 (0,2,0))로 height/padding/radius를
  리셋해 size 클래스((0,1,0))를 결정적으로 이긴다. size sm의 radius(md)도 variant box의
  radius(lg)와 같은 스펙시티라 `&&`로 올렸다 — 생성 순서 의존 제거(ui-styling.md 취지).
- **ProgressBar tone = Dot과 동일한 팔레트 이름** → `PROJECT_COLOR`(entities/project/color.ts)의
  유일한 사용처가 사라져 파일 삭제. web-entities.md 트리·README의 entities 예시 갱신
  (필요해지면 같은 자리에 되살린다고 명시).
- 태스크 문서의 "미사용 `sizes.handle`" 언급은 부정확 — `sheetHandle`이 width로 사용 중.
  세그먼트 높이 36px는 `sizes.controlMd`(controlSm 32 < controlMd 36 < tap 40) 신설로 치환.
- 빈 상태 패딩은 `spacing.emptyStateY`(60px) 신설 — project-detail의 48px도 의도적으로
  60px로 통일(작은 시각 변화, 빈 상태 한정). today의 `14px`은 매직 값 대신
  `calc({spacing.cardPadMd} - 2px)`로 유도(카드 제목 subtitle 22px vs 시간 numeric 18px
  lineHeight 차의 절반 = 광학 정렬). hero의 `margin: '4px 16px 16px'`도
  `xs/pageX/2xl` 토큰으로 치환.
- `fullWidthCls`(6개 파일) → `Button fullWidth` variant. Card as=button의
  `width: '100%'`(2곳)는 레이아웃 className이라 유지(ui-styling.md 허용 범위).

### 커밋 단위

1. `refactor(web): 공유 프리미티브 추출 + 매직 값 토큰화 (T009)`
   - recipes: input(variant box/inline 분리), text(strike), progress-bar 신설,
     panda.config(progress 등록, controlMd·timeCol·emptyStateY 토큰)
   - shared/ui: Input variant prop, Text strike prop, ProgressBar 신설, Button fullWidth
   - routes: `-app-tab-bar.tsx` 신설, 세 라우트가 tabBar 주입
   - features: 두 타이틀 입력 → `Input variant="inline"`, TabBar 복붙 3곳 제거,
     진행률 바 → ProgressBar, titleDoneCls 2곳 → strike, fullWidthCls 6곳 → fullWidth,
     매직 px 토큰 치환
   - entities/project/color.ts 삭제 (+ web-entities.md, README 갱신)

### 검증

- `bun run typecheck` 전체 통과, web vitest 12개 통과 (vitest 종료 시 "Vite server
  exiting" hang은 깨끗한 트리에서도 재현되는 기존 환경 이슈 — 테스트 자체는 성공).
- `biome check` / `bun run lint:deps`(depcruise) 통과 — AppTabBar는 routes 층이라
  경계 위반 없음.
- `panda cssgen`으로 생성 CSS 직접 확인 — `.input--variant_inline.input--variant_inline`
  이 size 클래스를 스펙시티로 이기는 것, progressTrack/progressFill·text--strike_true
  생성 확인.
- /verify 스킬: BFF(PGlite)+web 기동, Playwright로 가입→투데이→프로젝트 생성→태스크
  생성(인라인 타이틀)→완료 토글(취소선)→상세(인라인 편집)→프로젝트 상세(세그먼트 36px,
  진행률 100%, projects 탭→목록)→빈 상태 60px까지 17개 체크 전부 PASS, 스크린샷 육안
  확인. 콘솔 에러(하이드레이션 노이즈 제외) 0.
