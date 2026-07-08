# 리팩토링 백로그 — 예외적/비체계적 코드 정리

2026-07 전수 조사(디자인 시스템·BFF·웹 레이어링·프론트 패턴)에서 나온 발견 목록.
컨벤션이 잘 지켜지는 코드베이스에서 그 체계를 벗어난 예외들만 모았다.
완료한 항목은 지우지 말고 체크 + 커밋을 남긴다.

## 완료

- [x] **feature 간 직접 import 제거 + `web-no-cross-feature` 규칙** — tasks→projects
  (`NewProjectSheet`)는 라우트 주입으로, projects→tasks(`STATUS_ORDER`)는 승격으로 해소.
- [x] **FSD entities 레이어 부분 도입** — `entities/task/status.ts`,
  `entities/project/color.ts` + dep-cruiser 규칙 2개 +
  [web-entities.md](conventions/web-entities.md). 원칙: 전면 도입이 아니라 단위별 점진 채택.

## 우선순위 높음

- [ ] **1. `version` 필드의 삼자 모순 정리** — 문서 3곳이 서로 다른 말을 한다:
  - `packages/shared/src/task.ts:28` 주석 = 낙관적 잠금 ("일치할 때만 반영")
  - `apps/bff/src/platform/db/schema.ts:57` 주석 = 캐시 검증·디버깅용 변경 카운터
  - 실제 코드 `apps/bff/src/modules/task/adapters/sql.ts` = 비교 없이 무조건 +1
  - README의 "필드 단위 LWW — 409 없음" 모델이 진실이므로, 계약 주석을 실제 동작
    (LWW 변경 카운터)에 맞추는 쪽이 기본. 낙관적 잠금이 필요해지면 그때 별도 설계.
    태스크 공유 기능(task-sharing-architecture.md) 얹기 전에 반드시 정리.

- [ ] **2. BFF `user` 모듈 수직 슬라이스 정상화** — `modules/user/`에 `router.ts`뿐이고
  `UserStore` 포트(`modules/auth/ports.ts`)·`SqlUserStore` 어댑터(`modules/auth/adapters/sql.ts`)가
  auth 소유라 users 테이블 소유권이 auth에 있다. `verifyCredentials`(auth 관심사)와
  `findById`(user 관심사)가 한 인터페이스에 혼재 — 포트를 분리해 user 모듈에
  포트·어댑터를 코로케이션한다. 결합이 조립 루트(`trpc/context.ts`, `index.ts`)를 경유해
  dep-cruiser에 안 보이는 케이스.

- [ ] **3. 폼 인프라 통일** — auth 화면 2개는 TanStack Form + valibot + `shared/form.ts`
  전체 툴킷을 쓰는데, `features/projects/new-project-sheet.tsx`와
  `features/tasks/new-task-screen.tsx`는 useState + 수동 canCreate + 수동 mutate로
  손으로 다 짠다 (valibot 스키마 검증도 안 탐). 생성 폼 2개를 같은 인프라로 이관.

## 우선순위 중간

- [ ] **4. 낙관적 업데이트 중복 제거 + 캐시 정책 컨벤션** —
  - `definedFields` 헬퍼가 doc 주석까지 동일하게 `features/today/today-screen.tsx`와
    `features/tasks/task-detail-screen.tsx`에 복붙. onMutate/onError/onSettled 삼단
    배선도 통째로 중복 — shared(또는 entities/task)로 헬퍼 추출.
  - 캐시 갱신 전략이 4가지 혼재(낙관적+롤백 / setQueryData prime / invalidate만 /
    navigate 후 refetch). 언제 뭘 쓰는지 컨벤션 문서화.
  - `task.delete`는 에러 처리 없음(`task-detail-screen.tsx` remove 뮤테이션) — 실패 UI 추가.
  - queryKey 파생 두 방식 혼용(`options.queryKey` vs `trpc.x.queryKey()`) — 한쪽으로 통일.

- [ ] **5. 디자인 시스템 컨벤션 위반 2건** (ui-composition.md의 명시적 안티패턴) —
  - auth 링크: `login-screen.tsx`/`signup-screen.tsx`의 `signupLinkCls`가 BaseButton의
    포커스 링을 css()로 재구현한 수제 링크 → `<Button asChild><Link/></Button>`로.
  - WeekStrip(`features/today/week-strip.tsx`): 수동 `aria-pressed` + JS 조건부 recipe로
    단일 선택 배선 → Ark ToggleGroup + `_on` (올바른 패턴은 project-detail 세그먼트·
    color-swatch에 이미 있음). 하드코딩 타이포(fontSize 16px 등)·raw rgba도 토큰화.

- [ ] **6. 공유 프리미티브 추출 + 매직 값 토큰화** —
  - borderless 타이틀 `<input>`(`titleInputCls`)이 new-task·task-detail에 동일 복붙 →
    shared/ui `Input`의 variant로 승격.
  - `TabBar` 설정이 3개 화면에 복붙, onSelect 분기 제각각 → `AppTabBar` 추출.
  - 진행률 바(`projects-screen.tsx` trackCls/fillCls)는 재사용 프리미티브 → shared/ui.
  - 매직 px: `60px` 빈 상태 패딩 3곳 중복, `52px`(= `sizes.appBar`), `36px`(= `sizes.handle`) 등.

- [ ] **7. BFF 잔여 정리** —
  - `pub` 라우터만 shared valibot 계약 없이 인라인 리터럴 반환(`version: '0.0.0'`
    하드코딩) → `packages/shared`에 스키마 추가. `trpc/cache.ts`의 pubRouter 타입 결합도 인지.
  - `app.ts`의 `process.env.NODE_ENV` 직접 읽기 → `platform/config.ts`에 플래그 추가.
  - SSE 401(`modules/auth/middleware.ts`)이 `platform/errors.ts`의 UNAUTHENTICATED
    코드·메시지를 하드코딩 중복 → errors 상수 재사용.
  - `platform/db/sync.ts`·`sync-broker.ts`는 사실상 task 전용 인프라 — task 모듈로
    옮길지, platform에 남길 명분을 문서화할지 결정.

## 우선순위 낮음

- [ ] **8. tRPC 프로시저 경로 문자열 하드코딩** — `app/trpc.ts`의 `auth.refresh` URL과
  `isAuthEndpoint` 정규식이 라우터 이름 변경 시 컴파일 에러 없이 깨진다.
  `SYNC_EVENTS_PATH`처럼 shared 계약 상수로.
- [ ] **9. SSE 클라이언트 auth 경로** — `use-task-sync.ts`의 EventSource는 401→refresh
  단일 비행에 참여 못 해 액세스 쿠키 만료 시 재연결에만 의존. 허용할 거면 주석으로
  명시, 아니면 refresh 후 재구독 로직 추가. effect deps의 `range`+`range.from/to` 중복도 정리.
- [ ] **10. i18n 우회** — `router.tsx` 404 화면 한국어 하드코딩, `shared/ui/button.tsx`·
  `spinner.tsx`의 sr-only "로딩 중" — 사전에 `notFound`·`common.loading` 키 추가 후 이관.
- [ ] **11. design-guide 토큰 드리프트** — `apps/design-guide/src/lib/tokens.ts`의
  `successSoft`/`primaryHover` 등이 web panda.config와 다른 값. 프로토타입의 지위
  (시각 원본인지 폐기 대상인지)를 정하고 원본이면 동기화.
- [ ] **12. 날짜 라벨 포맷 집중화** — `Intl.DateTimeFormat` 인라인 사용 2곳
  (`features/today/week.ts`, `task-detail-screen.tsx`)을 `shared/time.ts`로.
- [ ] **13. 소소한 통일** — `project-detail-screen.tsx`의 Ark value `as TaskStatus` 캐스트를
  가드로, 내비게이션 API(`useRouter().navigate` vs `useNavigate()`) 한쪽으로.
