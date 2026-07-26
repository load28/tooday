# T030 — 탭바를 레이아웃으로 호이스팅 (탭 전환 시 탭바 유지)

- 상태: 완료
- 생성: 2026-07-26
- 완료: 2026-07-26

## 배경

T029로 탭 전환 시의 빈 화면·멈칫은 없어졌다. 남은 문제는 **탭바가 라우트마다
unmount/mount 된다**는 것이다.

탭바를 쓰는 화면이 셋인데 모두 형제 라우트고, 각자 `Screen`의 `bottomBar` 슬롯으로
탭바를 주입받는다.

- `routes/_app/today/route.tsx:18` — `<TodayScreen tabBar={<AppTabBar active="today" />} />`
- `routes/_app/projects/index.tsx:13` — `<ProjectsScreen tabBar={<AppTabBar active="projects" />} />`
- `routes/_app/projects/$projectId/route.tsx:14` — `<ProjectDetailScreen … tabBar={<AppTabBar active="projects" />} />`

공통 부모 `routes/_app/route.tsx:12`는 `component: Outlet`이라 **공유되는 DOM이 없다.**
전환하면 `screenViewport` 루트 div부터 `<footer>` → `<nav>` → 탭 버튼까지 전부
새 노드로 교체된다.

T029 이후 suspend가 사라져 unmount/mount가 한 커밋에서 처리되므로 흰 프레임은
끼지 않지만, 다음이 남는다.

- `tabBarIconWrap`의 `transition: background`(`recipes/tab-bar.ts`)가 새 노드라
  초기값부터 시작한다 — 활성 알약이 스르륵 옮겨가지 않고 툭 바뀐다.
- 탭바가 매번 새로 마운트되므로 라우트 배선 층이 화면마다 `active`를 손으로
  넘겨야 한다(같은 사실의 세 곳 중복).

## 작업 내용

### 1. `Screen`을 파트로 분해 (`shared/ui/screen.tsx`)

지금 `Screen`은 뷰포트·헤더·본문·오버레이·푸터를 한 컴포넌트가 다 갖는다.
레이아웃이 뷰포트+푸터를 소유하려면 쪼개야 한다.

`AppBar`(`AppBar.Leading`/`Title`/`Trailing`)와 같은 `Object.assign` 컴파운드
패턴으로 `Screen.Root` / `Header` / `Content` / `Overlay` / `Footer`를 추가하고,
기존 props API(`topBar`/`bottomBar`/`overlay`)의 `Screen`은 **그 파트들로 조립**한다.
마크업 정의가 한 곳에 남고, 탭바가 없는 화면 4곳(login·signup·new-task·task-detail)은
변경 없이 그대로 쓴다.

### 2. pathless 레이아웃 `_app/_tabs/` 신설

```
routes/_app/
  route.tsx                        인증 게이트 (변경 없음)
  _tabs/
    route.tsx                      ← 신설: Screen.Root + Outlet + Screen.Footer(탭바)
    -app-tab-bar.tsx               ← routes/ 루트에서 이동 (레이아웃이 소유)
    today/route.tsx                ← 이동
    projects/index.tsx             ← 이동
    projects/$projectId/route.tsx  ← 이동
  tasks/new/route.tsx              탭바 없음 — 그대로
  tasks/$taskId/route.tsx          탭바 없음 — 그대로
```

`_` 접두사라 URL은 그대로다(`/today`, `/projects`, `/projects/$id`).
탭바 DOM이 전환에도 살아남아 활성 전환 transition이 실제로 보인다.

스크롤 컨테이너(`screenContent`)는 레이아웃이 아니라 **각 화면이 계속 소유한다** —
레이아웃으로 올리면 탭 간 스크롤이 공유되기 때문이다. 화면은 여전히 unmount 되므로
탭별 스크롤은 지금처럼 초기화된다(탭별 스크롤 보존은 별개 문제라 범위 밖).

### 3. `AppTabBar`가 활성 탭을 스스로 파생

레이아웃에서 한 번만 렌더되므로 `active` prop을 없애고 pathname에서 파생한다.
같은 사실을 라우트 3곳에 손으로 넘기던 중복이 사라진다.
`/projects/$id`는 `/projects` 탭이 활성이고, 그 상태에서 projects 탭을 누르면
목록으로 올라가는 기존 동작은 유지한다.

## 완료 기준

- [x] `Screen.Root`/`Header`/`Content`/`Overlay`/`Footer` 파트 추가, 기존 `Screen`은 그 조합
- [x] `_app/_tabs/route.tsx`가 뷰포트+탭바를 소유하고 세 라우트가 그 아래로 이동
- [x] URL 불변 (`/today`, `/projects`, `/projects/$projectId`)
- [x] `AppTabBar`가 `active` prop 없이 pathname에서 파생
- [x] 탭바 없는 화면 4곳은 `Screen` props API 그대로 (변경 없음)
- [x] `bun run typecheck` / `check` / `lint:deps` / web 테스트 통과
- [x] E2E로 탭 전환 간 탭바 DOM 노드 유지 확인 (변경 전후 A/B)

## 대화 기록

> **사용자**: 탭바호스팅도 진행하자
>
> **Claude**: (T029 완료 후속) 탭바를 쓰는 화면이 today/projects/project-detail
> 셋임을 확인하고, `_app/_tabs/` pathless 레이아웃으로 셋을 묶어 뷰포트와 푸터
> 탭바를 레이아웃이 소유하게 한다. `Screen`을 컴파운드 파트로 분해해 탭바 없는
> 화면 4곳은 기존 props API를 그대로 쓰게 한다.

이 태스크의 발단이 된 논의(탭 전환 깜빡임 진단, 레이아웃 공유만으로는 부족하다는
결론)는 [T029](T029-web-cache-lifetime.md)의 「대화 기록」에 있다.

## 작업 로그

- 2026-07-26: 태스크 생성 + 구현.
  - `shared/ui/screen.tsx` — `Screen.Root`/`Header`/`Content`/`Overlay`/`Footer` 파트를
    `Object.assign` 컴파운드(AppBar와 같은 패턴)로 추가하고, 기존 props API의 `Screen`을
    그 파트들의 조합으로 재작성. 마크업 정의가 한 곳에 남는다.
  - `routes/_app/_tabs/route.tsx` 신설 — `Screen.Root` + `Outlet` + `Screen.Footer(AppTabBar)`.
    `today/route.tsx`·`projects/index.tsx`·`projects/$projectId/route.tsx`와
    `-app-tab-bar.tsx`를 `git mv`로 그 아래 이동.
  - `-app-tab-bar.tsx` — `active` prop 제거, pathname에서 파생
    (`TABS.find((tab) => pathname.startsWith(TAB_PATH[tab]))`). 라우트 3곳의 중복 배선 제거.
  - 세 화면(`today-screen`·`projects-screen`·`project-detail-screen`) — `tabBar` prop과
    `ReactNode` import 제거, `<Screen>` → `<><Screen.Header/><Screen.Content/></>`.
  - `routeTree.gen.ts`는 `bun run build`(라우터 플러그인)로 재생성. 생성 결과에서
    `fullPath`가 `/today`·`/projects/`·`/projects/$projectId`로 유지됨을 확인.
  - 검증 — `bun run typecheck` 4/4, `biome check` 179파일 clean, `lint:deps` 위반 0,
    `@tooday/web` vitest 24 pass.
  - E2E(`.claude/skills/verify` 레시피) — 탭바 `<nav>`에 `dataset.verifyMark`를 명령형으로
    심고 탭 전환 후 남아 있는지로 DOM 노드 동일성을 판정. **변경 후 `true`, 같은
    스크립트를 stash한 변경 전 코드에 돌리면 `false`** — 호이스팅이 실제로 동작함을
    A/B로 확인. 더불어 `/tasks/new`에는 탭바가 없고, `/projects`에서 활성 탭이
    "프로젝트"로 표시되는 것도 확인.
  - `@tooday/web` 테스트의 "Vite server exiting" 경고는 T029(HEAD)에서도 재현되는 기존
    flake — 테스트 자체는 24/24 통과.
