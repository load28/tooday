# T032 — 로그아웃 UI (설정 화면 셸) 신설

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-27
- 완료: 2026-07-27

## 배경

BFF `auth.logout`(리프레시 폐기 + 쿠키 삭제, `apps/bff/src/modules/auth/router.ts:59`)은
있는데 **웹 UI에 로그아웃 트리거가 전혀 없다**(`apps/web/src` grep 결과 0). 로그인해도
앱에서 로그아웃할 방법이 없다. 이메일/비밀번호 로그인·회원가입은 이미 완비돼 있다.

### 조사 근거 (기술 문서 스킬 — 엔터프라이즈/모바일 웹뷰)

- **탭바에 설정을 넣지 않는다**: iOS HIG는 탭바를 내비게이션 전용·3~5개로 두고 설정은
  "찾기 쉽되 너무 튀지 않게". Material 3은 하단 내비 목적지를 3~5개·**동등 중요도**로 본다.
  설정은 today/projects와 동등한 최상위가 아니므로 탭 자리를 주지 않는다. → **헤더 진입점 +
  push되는 설정 화면**이 정석.
- **웹뷰 특화**: safe-area(`env(safe-area-inset-*)`)는 `viewport-fit=cover`가 있어야 동작 —
  이미 설정됨(`apps/web/src/routes/__root.tsx:33`). 웹뷰엔 브라우저 back이 없어 push 화면엔
  앱 내 back(`AppBar.Leading`) 필수.
- **로그아웃 보안 (OWASP WSTG)**: 로그아웃은 **서버 측 세션을 반드시 무효화**하고 끝나면
  로그인/공개 영역으로 redirect. "클라이언트 토큰만 바꾸고 서버 상태 유지" 함정 → 웹뷰는
  httpOnly 쿠키가 남으면 다음 진입에서 자동 재로그인되므로 **`auth.logout`을 반드시 await**
  해야 한다(클라이언트-only 로그아웃 불가).

## 작업 내용 (스코프 A — 로그아웃 + 설정 셸만)

프로필 편집(`/settings/profile`, `user.update`)은 **다음 태스크로 분리**(BFF 뮤테이션·검증이
딸린다). 이번엔 로그아웃과 그 그릇(설정 화면)만.

- **진입점**: 탭 신설이 아니라 `AppBar.Trailing`에 **계정 아이콘 버튼**을 today/projects
  헤더에 추가 → `navigate('/settings')`. (라우트 경로 이동일 뿐 feature 간 import 아님)
- **설정 화면** `routes/_app/settings/route.tsx` (풀스크린, `_tabs` 밖이라 탭바 없음 —
  `/tasks/new`와 동형), `AppBar.Leading` back(`router.history.back()`).
  화면 컴포넌트는 `features/auth/settings-screen.tsx`(로그아웃은 auth 관심사, 셸도 현재
  auth/계정 표면이라 한 feature에 둔다 — cross-feature import 회피).
  - 계정 이메일 표시(`trpc.user.me`, 게이트가 이미 캐시 → 즉시).
  - **하단 `tone="danger"` 로그아웃 버튼**(엄지 도달) → 확인 `BottomSheet`(파괴적 액션 확인,
    기존 프리미티브 재사용) → `auth.logout` **await** → `queryClient.clear()`(전 캐시 비움 —
    웹뷰 지속성상 이전 유저 데이터 잔존 방지) → `navigate('/login')`.
  - 실패 시: 시트에 에러 표시 + 로그인 유지(재시도). 버튼 loading.
- **i18n**: `shared/i18n/schema.ts`에 `settings` 네임스페이스 + 계정 진입 aria-label,
  `ko.ts`에 메시지(타입 안전).

### 기각한 대안

- **설정 탭(3번째 탭)**: HIG/Material 원칙 위반(설정은 동등 중요도 최상위가 아님), 2탭 앱에
  탭 자리 낭비. 진입점은 헤더 아이콘이 표준.
- **헤더 → 드롭다운 메뉴**: 데스크톱 패턴이라 터치·웹뷰에 부적합. 바텀시트가 네이티브.
- **클라이언트-only 로그아웃**: 쿠키가 서버에서 안 지워져 자동 재로그인(OWASP 함정). 불가.

## 완료 기준

- [x] today/projects 헤더에서 계정 아이콘 → `/settings` 진입
- [x] 설정 화면: 이메일 표시 + 로그아웃 버튼 + back
- [x] 로그아웃: `auth.logout` await → 캐시 clear → `/login`, 실패 시 에러+유지
- [x] `bun run typecheck` 통과 (routeTree 재생성 포함)
- [x] 웹 테스트 24 passed, biome 통과

## 대화 기록

> **Minyoung**: 지금 ui에 로그인 기능자체가 아예없어 진행해보자
>
> **Claude**: (탐색) 이메일/비밀번호 로그인·회원가입은 UI·BFF 다 완비. 실제 공백은
> **로그아웃 UI**(BFF는 있는데 웹에 트리거 0), 그리고 소셜 로그인·비밀번호 재설정 부재.
> 무엇을 만들지 확인.

> **Minyoung**: 로그아웃기능이 없잖아 ui에
>
> **Claude**: 로그아웃 UI로 스코프 확정. 앱 셸은 today/projects 2탭뿐, 계정 표면 없음.
> 배치가 핵심 결정.

> **Minyoung**: 모바일 웹뷰를 고려해서 ux를 설계해애함
>
> **Claude**: 웹뷰 제약(엄지 도달·바텀시트·safe-area·앱 내 back·쿠키 지속) 정리. 기존
> `BottomSheet` 프리미티브 확인.

> **Minyoung**: 기술조사 스킬을 통해서 엔터프라이즈에서 웹뷰를 고려했을때 어떻게 접근하는게
> 좋은지 생각해보자
>
> **Claude**: (HIG/Material/OWASP/MDN/RFC 조사) 탭바에 설정 넣지 않음, 헤더 진입 + push 설정
> 화면이 정석. 로그아웃은 서버 세션 무효화 필수.

> **Minyoung**: 보통 내가 본 앱들은 설정화면을 별도로 진입해서 로그아웃버튼을 눌러서
> 나가던데, 거기에 유저 설정 메뉴도 있어서 그거 누르면 프로필 편집 화면으로 이어지고
>
> **Claude**: 그 패턴이 조사 결과와 일치. 스코프 A(로그아웃+설정 셸) vs B(프로필 편집까지)
> 제시, A 추천(프로필 편집은 BFF 뮤테이션 딸려 별도 태스크).

> **Minyoung**: 태스크문서를 만들어서 진행하자 a까지만 진행하자
>
> **Claude**: 스코프 A로 T032 착수.

## 작업 로그

- 2026-07-27: 태스크 생성. 구현. i18n `settings` 네임스페이스(schema+ko),
  `features/auth/settings-screen.tsx`(이메일 + danger 로그아웃 → 확인 BottomSheet →
  `auth.logout` await → `queryClient.clear()` → `/login`, 실패 시 에러+유지),
  `routes/_app/settings/route.tsx`(풀스크린), today/projects 헤더에 `UserRound` 진입
  아이콘 → `/settings`. `routeTree.gen.ts`는 라우트 파일 추가 시 TanStack 플러그인
  워처가 자동 재생성(+21줄). 검증: typecheck 4/4, 웹 테스트 24 passed, biome 클린.
