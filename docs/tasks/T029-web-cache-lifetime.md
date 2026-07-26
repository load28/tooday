# T029 — 탭 전환 빈 화면·멈칫 제거 (클라이언트 캐시 수명 정상화)

- 상태: 완료
- 생성: 2026-07-26
- 완료: 2026-07-26

## 배경

탭(today ↔ projects)을 전환하면 화면이 잠깐 멈췄다가 **빈 화면**을 거쳐 그려진다.
SSR과는 무관하다 — SSR은 첫 문서에만 관여하고, 탭 전환은 하이드레이션 이후
클라이언트 라우팅이다.

### 빈 화면의 원인 — `gcTime: 0`

`apps/web/src/app/trpc.ts:88`의 `queries: { retry: false, staleTime: 0, gcTime: 0 }`.

데이터를 읽는 창구가 둘인데 규칙이 다르다.

| 창구 | 데이터 있음 | 데이터 없음 |
| --- | --- | --- |
| loader의 `ensureQueryData` | staleTime과 무관하게 즉시 반환 (구독 안 만듦) | fetch 후 대기 |
| 컴포넌트의 `useSuspenseQuery` | 즉시 렌더 + 낡았으면 백그라운드 갱신 | **suspend** |

`ensureQueryData`는 구독을 만들지 않으므로 loader가 캐시를 채운 직후 관찰자 수가
0이다. `gcTime: 0`이면 그 즉시 gc 타이머가 터져 **컴포넌트가 마운트되기 전에**
캐시가 삭제된다. 그래서 마운트 시 `useSuspenseQuery`가 suspend 하고,
`router.tsx`에 `defaultPendingComponent`가 없어 Suspense fallback이 비어 있으므로
**화면 전체가 빈다**. 탭바까지 사라지는 이유는 탭바가 데이터를 읽는 컴포넌트의
반환값 안(`Screen`의 `bottomBar` 슬롯)에 있어 Suspense 경계 안쪽이기 때문이다.

즉 탭 전환 1회당 `task.range`를 **2번**(loader + suspend 복구) 받고 둘 다 블로킹이다.

### 근거 조사 — `gcTime: 0`은 의도된 설정이 아니다

- `git log -S"gcTime" --all` → 커밋 `067611f` 하나. 이 커밋은 **리포지토리 루트
  커밋**(`git rev-list --max-parents=0`)으로, 전체 코드가 squash되어 들어온
  초기 임포트다. 커밋 메시지는 리프레시 회전 재사용 탐지 내용뿐이라 쿼리
  클라이언트 설정에 대한 결정 기록이 없다.
- `gcTime` 문자열은 리포 전체에서 `apps/web/src/app/trpc.ts:88` 한 곳뿐. 태스크
  문서 T001–T028, `docs/conventions/web-cache-policy.md` 어디에도 언급이 없다.
- **오히려 정면으로 모순되는 설계 문서가 있다.**
  `docs/authentication-architecture.md:118-135`:
  > `queryClient.ensureQueryData`를 사용하여 캐시 우선 활용 / 캐시에 데이터가
  > 있으면 (stale이든 아니든) 그대로 반환 / 클라이언트 네비게이션: … 캐시 있음 →
  > 즉시 반환 → 통과 (네트워크 안 탐, **네비게이션 블로킹 제로**)

  `gcTime: 0`이면 캐시가 항상 비어 있어 이 시나리오는 성립할 수 없다.
  같은 문서 `:222`의 로그아웃 시 `removeQueries` 절차도 지울 캐시가 없어 무의미하다.
- `apps/web/src/features/today/today-screen.tsx:81`의 주석
  "loader가 …ensureQueryData로 채워 두므로 첫 렌더에서 suspend 하지 않는다"도
  `gcTime: 0` 때문에 성립하지 않는 서술이다.
- 동기화 설계와도 어긋난다. `use-task-sync.ts:34-35`의 `pull()`은
  `getQueryData`가 비면 즉시 리턴한다. `gcTime: 0`이면 화면 재진입 시 캐시가 없어
  **커서·델타 경로가 한 번도 동작하지 않았다** (화면을 켜 둔 채 받는 실시간
  신호에서만 동작). 캐시를 살려야 이 기계장치가 실제로 쓰인다.

### 캐시를 살릴 때 새로 깨지는 것 2가지

1. **`user.me`는 자동 갱신되지 않는다.** `user.me`를 `useQuery`/`useSuspenseQuery`로
   구독하는 컴포넌트가 하나도 없다(`trpc.ts:109`의 `ensureQueryData`와
   `login-screen.tsx:47`·`signup-screen.tsx:48`의 `setQueryData`뿐). 관찰자가 없으면
   `refetchOnMount`가 발동할 주체가 없고 `ensureQueryData`는 낡음을 무시하므로,
   `gcTime`이 곧 그 데이터의 수명이 된다.
2. **캐시 정책 전략 ④가 깨진다.** `web-cache-policy.md`의 ④는 "뮤테이션 후 화면을
   떠날 때 — 다음 화면 loader가 채우므로 캐시를 만지지 않는다"인데, 이게 성립하던
   건 `gcTime: 0` 덕분이었다. 해당 코드는 `new-task-screen.tsx`(`task.create`)와
   `task-detail-screen.tsx:83-87`(`task.delete`) — 둘 다 invalidate 없이
   `navigate({ to: '/today' })`만 한다. 캐시가 살아 있으면 loader의
   `ensureQueryData`가 옛 스냅샷을 즉시 반환해 **방금 만든 태스크가 없는 화면**(또는
   방금 지운 태스크가 남은 화면)이 뜬 뒤 수백 ms 후 바뀐다.

`invalidateQueries`로는 2번을 못 고친다 — invalidate는 낡음 표시 + 활성 관찰자
재요청이고, loader의 `ensureQueryData`는 낡음을 무시하기 때문이다. 떠나는 경우엔
`removeQueries`여야 한다.

## 작업 내용

### 1. 전역 기본값 복원 (`app/trpc.ts`)

`staleTime: 0, gcTime: 0`을 **제거**한다. 둘 다 명시하지 않으면 React Query v5
기본값(`staleTime` 0 / `gcTime` 5분)이 적용된다 — 기본값과 같은 값을 굳이 쓰지 않는다.

`staleTime`을 0(기본)으로 두는 이유: 캐시로 즉시 렌더한 뒤 마운트 트리거에서
백그라운드 재검증이 돌아, 과거 데이터를 보는 창이 gcTime이 아니라 **재요청 왕복
시간(수백 ms)** 으로 묶인다. `staleTime`을 올리면 그만큼 진짜 묵은 데이터를 본다.

`staleTime`은 요청을 만드는 스위치가 아니라 트리거(`refetchOnMount` /
`refetchOnWindowFocus` / `refetchOnReconnect` / `invalidateQueries`)를 통과시킬지
거르는 스로틀이다. `refetchInterval`은 꺼져 있으므로 폴링 경로는 없다.

`router.tsx`의 `defaultPreloadStaleTime: 0`은 그대로 둔다 — 캐시가 살아나면
preload가 loader를 다시 돌려도 `ensureQueryData`가 즉시 반환해 무해하다.

### 2. `user.me`만 별도 수명 (`app/trpc.ts` `fetchSessionUser`)

```ts
staleTime: 15 * 60_000,
gcTime: 30 * 60_000,
revalidateIfStale: true,
```

- `revalidateIfStale`: 캐시를 즉시 반환해 내비게이션을 막지 않고(문서가 명시한
  "블로킹 제로"), 낡았으면 백그라운드로만 세션을 재확인한다.
- 15분: Auth0가 SPA `checkSession()` 폴링 간격으로 권하는 최소치. NIST SP 800-63B의
  재인증 규범(AAL2 12시간 / 30분 비활성)이나 Entra CAE(토큰 수명 최대 28시간 +
  이벤트 기반 폐기)에 비하면 훨씬 보수적이다.
- **`gcTime`을 `staleTime`보다 크게 둬야 한다.** TanStack Query 소스상 gc 타이머는
  ① 생성자 ② `removeObserver()` ③ **`fetch()`의 finally**에서만 리셋된다
  (`query-core/src/removable.ts`, `query.ts`). 관찰자가 없는 `user.me`는 백그라운드
  갱신(fetch)만이 타이머를 리셋할 수 있으므로, `staleTime`이 `gcTime`보다 크면
  갱신이 일어나기 전에 캐시가 먼저 삭제돼 **블로킹 fetch가 생긴다**.
  `staleTime`의 `gcTime` 초과분은 언제나 무의미하다.

### 3. 세션 폐기를 이벤트로 감지 (`app/trpc.ts` `fetchWithRefresh`)

refresh까지 실패하면 = 세션이 죽었으면, `user.me` 캐시를 제거한다. 그러면 다음
`beforeLoad`의 `ensureQueryData`가 데이터 없음 → fetch → 401 → `catch` → `null` →
기존 redirect 로직이 `/login`으로 보낸다. 라우터를 끌어올 필요가 없다.

이게 있어야 15분이 정당해진다. 폴링 주기를 늘리는 대신 실제 거부 이벤트에
반응하는 것 — Entra CAE / OIDC Back-Channel Logout이 취한 방향의 축소판이고,
RFC 7662 §4가 말하는 revocation window를 좁히는 설계 책임에 해당한다.

### 4. 전략 ④ 수정 (화면을 떠나는 뮤테이션 2곳)

`navigate` 직전에 다음 화면이 읽을 캐시를 비운다.

- `new-task-screen.tsx` (`task.create`) → `task.range` 제거
- `task-detail-screen.tsx` (`task.delete`) → `task.byId({id})` + `task.range` 제거
  (`byId`를 안 지우면 삭제 후 뒤로가기 시 loader가 삭제된 태스크를 캐시에서 꺼내 보여준다)

**머물면 `invalidate`, 떠나면 `remove`.** 머무는데 remove하면 활성 관찰자가
suspend해서 빈 화면이 되고, 떠나는데 invalidate하면 loader가 옛 데이터를 준다.
`task.update`(전략 ①)·`task.createProject`(전략 ③)는 화면에 머무르므로 **그대로 둔다**.

### 5. 컨벤션 문서 갱신

`docs/conventions/web-cache-policy.md`에 위 규칙을 명문화한다. 전략 ④의 "캐시를
만지지 않는다"는 `gcTime: 0` 전제의 문장이라 그대로 두면 다음 사람이 같은 함정을
밟는다.

### 범위 밖 (별도 태스크)

- **탭바 호이스팅** — 탭바가 라우트마다 unmount/mount 되는 문제. `_app/_tabs/`
  pathless 레이아웃을 만들어 viewport + footer 탭바를 레이아웃이 소유하게 한다.
  빈 화면이 사라지면 remount 자체는 한 커밋에서 처리돼 거의 안 보이나, 활성 탭
  transition이 초기화되고 스크롤·로컬 state가 리셋되는 문제는 남는다.
- `defaultPendingComponent` 추가 (향후 어떤 이유로든 suspend 시 빈 화면 방지).

## 완료 기준

- [x] `apps/web/src/app/trpc.ts`에서 전역 `staleTime`/`gcTime` 제거
- [x] `fetchSessionUser`가 `staleTime 15분` / `gcTime 30분` / `revalidateIfStale`
- [x] `fetchWithRefresh`가 refresh 실패 시 `user.me` 캐시 제거
- [x] 떠나는 뮤테이션 2곳이 `navigate` 전 `removeQueries`
- [x] `web-cache-policy.md`에 "머물면 invalidate, 떠나면 remove" + `gcTime > staleTime` 규칙
- [x] `bun run typecheck` 통과
- [x] `bun run check` (Biome) 통과
- [x] `bun run lint:deps` 통과
- [x] `bun test` 통과 (web 24 pass)

## 참고 문헌

- [Standard] RFC 7662 (OAuth 2.0 Token Introspection) §2.2, §4 — 보호 자원의 토큰
  상태 캐싱 허용, 그로 인한 revocation window와 캐시 유효기간 판단 책임
- [Standard] NIST SP 800-63B — 재인증 주기 (AAL1 30일 / AAL2 12시간 + 30분 비활성)
- [Official] Microsoft Entra Continuous Access Evaluation — CAE 세션 토큰 수명
  최대 28시간, critical event 기반 near-real-time 폐기
- [Official] Auth0 Configure Silent Authentication — `checkSession()` 폴링 최소 15분
- [Official] TanStack Query v5 Important Defaults — `staleTime` 0 / `gcTime` 5분
- [Official] TanStack Query `query-core/src/removable.ts`, `query.ts` — `scheduleGc()`
  호출 지점(생성자 / `removeObserver` / `fetch` finally)

## 대화 기록

> **사용자**: 궁금한게 왜 ssr인데 탭전환시 탭자체도 다시 렌더링될까? 깜빡이던데?
> 난 부드럽게 라우팅하고싶음
>
> **Claude**: SSR 때문이 아니다. SSR은 첫 문서 한 번만 관여하고, 하이드레이션 이후
> 탭 전환은 100% 클라이언트 라우팅이다. 원인은 ① 탭바가 라우트마다 새로 마운트된다
> (`/today`와 `/projects`는 형제 라우트고 탭바를 각 화면의 슬롯으로 주입, 공통 부모
> `_app/route.tsx`는 `component: Outlet`이라 공유 DOM이 없음) ② 캐시를 매번 버려서
> 전환이 네트워크에 묶인다(`gcTime: 0`) ③ preload가 무력화돼 있다. [중략 — 수정
> 방향 A(탭바를 레이아웃으로) / B(캐시 유지) / C(viewTransition) 제시]
>
> **사용자**: 하나 궁금한게 각자 탭을 가지고있어도 새로 렌더되는 시점에 빈 화면으로
> 전환되는 이유는?
>
> **Claude**: 빈 화면의 정체는 "비어 있는 Suspense fallback"이다. 라우터는 각 라우트
> 매치를 자기 `<Suspense>`로 감싸고 fallback은 `pendingComponent` → `defaultPendingComponent`
> 인데 `router.tsx`에 둘 다 없다. 화면이 `useSuspenseQuery`로 데이터를 읽는데
> `gcTime: 0` 때문에 loader가 채워둔 캐시가 마운트 전에 GC돼 suspend 한다.
> `ensureQueryData`는 옵저버를 만들지 않으므로 loader resolve 시점에 옵저버가 0이고,
> gcTime 0이면 다음 매크로태스크에 캐시가 통째로 제거된다. 탭바까지 사라지는 건
> 탭바가 suspend 하는 컴포넌트의 반환값 안에 있어 Suspense 경계 안쪽이기 때문이다.
>
> **사용자**: 걍 레이아웃을 공유하게 하면 해결될일 아님?
>
> **Claude**: 절반만 맞다. 레이아웃을 공유해도 자식 라우트 매치는 여전히 자기
> Suspense 경계를 갖고 `gcTime: 0`이면 계속 suspend 한다. "화면 전체가 빔" →
> "탭바만 남고 위쪽 전체가 빔"이 될 뿐이다. 체감 기준으로는 `gcTime`이 먼저다
> (앞서 레이아웃을 "핵심"이라 한 것을 정정). `gcTime`만 고치면 suspend가 없어지고,
> React가 unmount/mount를 한 커밋에서 처리하므로 remount 자체는 거의 안 보인다.
> 남는 증상은 탭 활성 transition 초기화와 스크롤·state 리셋이다.
>
> **사용자**: gctime이 기존에 0으로 설정된 근거를 찾아봐
>
> **Claude**: 근거를 찾을 수 없다. 오히려 반대 근거가 나온다. [조사 결과 — 루트
> 커밋에서 squash 임포트, 문서·태스크 어디에도 언급 없음,
> `authentication-architecture.md:118-135`와 정면 모순, `today-screen.tsx:81` 주석
> 모순, `use-task-sync.ts`의 델타 설계와 어긋남. 상세는 위 「배경」 참조]
>
> **사용자**: 그러면 어떻게 변경하는게 맞나?
>
> **Claude**: [중략 — 초기안. 이때 "전환 멈칫"의 원인을 `staleTime`으로 지목했으나
> 오류였음. `ensureQueryData`는 데이터가 있으면 staleTime과 무관하게 즉시 반환하고
> 없을 때만 fetch한다(v5는 `revalidateIfStale` 기본 false). 멈칫도 빈 화면도 원인은
> 전부 `gcTime: 0` 하나이며, `staleTime: 30초` 제안은 철회. `staleTime: 0`을 유지해야
> 마운트마다 백그라운드 재검증이 돌아 stale-while-revalidate가 된다]
>
> **사용자**: gc랑 stale이 설정되어있으면 빠르게 전환시 과거 데이터를 볼수있는거
> 아닌가? sse로 체인지 이벤트와 직정수정시 쿼리무효화가 되서 상관없나? 그리고
> stale이면 새로운곳에서 요청하면 어치피 다시 가쟈와서 괜찮나?
>
> **Claude**: ① 맞다. 다만 그 창은 gcTime(5분)이 아니라 재검증 왕복(수백 ms)으로
> 묶인다 — staleTime 0이라 마운트 즉시 재검증이 시작되므로. 트레이드오프의 실체는
> "빈 화면 ↔ 잠깐 과거 데이터"다. ② 수렴 경로가 둘(관찰자 재검증 / SSE 재접속 →
> 델타)이고 독립적이다. `app.ts:86-87`에서 접속 직후 change를 한 번 쏘는 걸 확인했다.
> 반전은 (b)가 `gcTime: 0`에서 화면 재진입 시나리오에 대해 죽은 코드였다는 것 —
> 캐시를 살리는 게 동기화 설계를 약화시키는 게 아니라 만들어둔 기계장치를 처음
> 쓰게 만든다. ③ 관찰자가 붙는 쿼리는 그렇지만 `user.me`는 예외다. 구독하는
> 컴포넌트가 하나도 없어 refetchOnMount를 발동시킬 주체가 없고, gcTime이 곧 수명이
> 된다. 처방은 `revalidateIfStale: true`.
>
> **사용자**: 결국 gc를 5뷴으로 하고 stale을 0으로 하면모든 케이스 커버된다는거자나
>
> **Claude**: 아니다. 두 군데가 안 덮인다. 하나는 `user.me`고, 하나는 방금 발견했다 —
> 전략 ④가 깨진다. `new-task-screen.tsx`(`task.create`)와 `task-detail-screen.tsx:83-87`
> (`task.delete`)이 invalidate 없이 navigate만 하는데, 캐시가 살면 loader가 옛
> 스냅샷을 즉시 반환해 방금 만든 게 없는 화면이 뜬다. ("두 줄이면 된다"고 한 앞의
> 말을 정정한다.) 처방은 떠나기 전 `removeQueries`.
>
> **사용자**: 이해가 안되 하나씩 쉽게 상세히 설명해봐
>
> **Claude**: [중략 — `staleTime`/`gcTime` 구분(유통기한 vs 버리는 시점), 창구
> A(`ensureQueryData`)/B(`useSuspenseQuery`)의 규칙 차이, 현재·변경 후 타임라인
> 단계별 추적, 예외 2건의 발생 이유. 상세는 위 「배경」 참조]
>
> **사용자**: 사실상 데이처를 갱신하고 서세스일ㅋ개 리무브퉈리를 해야겠네.
>
> **Claude**: 아니다, 위험하다. 활성 관찰자가 있는 상태에서 `removeQueries`를 하면
> 그 컴포넌트가 suspend해서 빈 화면이 된다 — `gcTime: 0`이 자동으로 하던 짓을 손으로
> 하는 셈이다. 갈림길은 "성공했나"가 아니라 "화면에 남나, 떠나나"다. 더 정확히는
> 다음에 그 데이터를 읽는 게 창구 B냐 A냐. **머물면 `invalidate`, 떠나면 `remove`.**
> 핵심은 `invalidateQueries`가 창구 A에 안 통한다는 것 — `ensureQueryData`는 낡음
> 표시를 무시하고 있으면 그냥 준다. 손대는 건 떠나는 2개뿐이고 `task.update`·
> `task.createProject`는 그대로 둔다. 삭제는 `task.byId`도 함께 지운다.
>
> **사용자**: 유저데이터는 캐시를 즉시주고 뒤에서 갱신한다는거지
>
> **Claude**: 맞다. 다만 갱신 결과는 이번 내비게이션에는 안 쓰이고 캐시에만 들어가
> 다음 내비게이션에 반영된다. 세션 폐기 감지는 "다음 내비게이션"이 된다.
>
> **사용자**: 근데 stale 0 이면계속 갱신하는거 아냐?
>
> **Claude**: 아니다. `stale`은 요청을 만들지 않는다. 갱신은 트리거
> (`refetchOnMount`/`refetchOnWindowFocus`/`refetchOnReconnect`/`invalidateQueries`)가
> 일으키고 `refetchInterval`(폴링)은 꺼져 있다. `staleTime`은 트리거가 왔을 때
> 통과시킬지 거르는 스로틀이다. 가만히 있으면 요청 0건이다. 오히려 현재
> (`gcTime: 0`)는 탭 전환당 2건(둘 다 블로킹)이 나가고, 바꾸면 1건(논블로킹)으로 준다.
>
> **사용자**: 내가 궁금한건 네비에기션마다 즉시 신선도를 잃어서 매번 요청하기땨문에...
> 유저데이터가 불필요하게 계속 요청된다생각한거지
>
> **Claude**: 지적이 정확하다. `user.me`는 BFF가 매번 세션 라이브니스 체크를 하는
> 싸지 않은 요청이다. 전역이 아니라 이 쿼리에만 `staleTime`을 준다 — `task.range`는
> 자주 바뀌는 컨텐츠라 0, `user.me`는 게이트 용도라 초 단위 정확도가 불필요하다.
>
> **사용자**: 엔터프라이즈에선 유저정보같은걸 어느정도 신선도를 유지하나?
>
> **Claude**: [중략 — 조사 결과. 업계는 인가 강제(서버)와 프로필 표시(클라 캐시)를
> 분리하고, 규범적 재인증 주기는 시간~일 단위(NIST AAL2 12시간/30분 비활성),
> 방향은 폴링 축소 + 이벤트 푸시(Entra CAE 토큰 28시간 + near-real-time 폐기,
> OIDC Back-Channel Logout), 폴링이 필요한 경우 Auth0 권장은 최소 15분,
> RFC 7662 §4는 캐싱을 허용하되 유효기간 판단을 구현자에게 맡긴다. TooDay는
> README:28-29대로 **서버가 매 요청 라이브니스 체크로 즉시 무효화**를 이미 강제하므로
> 클라 캐시는 보안 경계가 아니라 순수 UX 문제다. 상세는 위 「참고 문헌」]
>
> **사용자**: stale은 0은 지속적으로 요청하니 이것밀고 15분 어떤가?
>
> **Claude**: 15분 좋다. 다만 `gcTime`을 그대로 두면 정반대로 동작한다. TanStack
> Query 소스 확인 결과 gc 타이머는 생성자 / `removeObserver` / **`fetch()`의 finally**
> 에서만 리셋된다. 관찰자가 없는 `user.me`는 백그라운드 갱신(fetch)만이 타이머를
> 리셋할 수 있으므로, `staleTime 15분` + `gcTime 5분`이면 15분간 fresh라 갱신이
> 안 일어나고 → gc 리셋도 안 되고 → 5분에 캐시가 삭제돼 **블로킹 fetch**가 생긴다.
> 규칙: 관찰자 없는 쿼리는 `gcTime > staleTime`. 그리고 15분으로 늘리면 폐기 감지
> 지연도 15분이 되므로, `fetchWithRefresh`에서 refresh 실패 시 `user.me` 캐시를
> 지우는 이벤트 감지를 같이 넣어야 정당해진다.
>
> **사용자**: 그럼 유저데이터값처런 변하지않는거사만 gc랑 stale 둘다 15분 하면되지
> / 아니다 30분 15분처럼 너가 제인한것도 맞네 유저데이터만
>
> **Claude**: 좋다. `user.me`에만 `staleTime 15분` / `gcTime 30분`, 전역은 기본값.
> 그대로 진행한다.

## 작업 로그

- 2026-07-26: 태스크 생성 + 구현.
  - `app/trpc.ts` — 전역 `staleTime: 0, gcTime: 0` 제거(RQ 기본값 사용),
    `fetchSessionUser`에 `SESSION_STALE_MS`(15분)/`SESSION_GC_MS`(30분)/
    `revalidateIfStale`, `fetchWithRefresh`에 세션 상실 콜백 추가.
    콜백은 `createTrpc` 안에서 `trpc` 프록시를 지연 참조하는 클로저로 배선해
    queryKey 파생 컨벤션(`trpc.<proc>.queryKey()`)을 유지했다.
  - `new-task-screen.tsx` — `queryClient`를 route context에서 받아 `task.create`
    성공 시 `task.range` 제거 후 navigate.
  - `task-detail-screen.tsx` — `task.delete` 성공 시 `task.range`는 navigate 전,
    이 화면이 구독 중인 `task.byId`는 navigate 후(언마운트 뒤)에 제거.
    구독 중 제거 시 `useSuspenseQuery`가 suspend 해 화면이 비는 것을 피한다.
  - `docs/conventions/web-cache-policy.md` — 전략 ④ 이름·설명 수정
    ("캐시를 만지지 않는다" → "remove 후 navigate"), "머물면 invalidate, 떠나면
    remove" 절과 캐시 수명(`gcTime > staleTime`) 절 신설.
  - 검증: `bun run typecheck` 4/4 성공, `bun run check` 178파일 clean,
    `bun run lint:deps` 위반 0, `@tooday/web` vitest 24 pass.
  - `@tooday/bff`(exit 99, 101테스트 0 fail)와 `@tooday/design-guide`(Vite 종료
    행)의 실패는 stash 후 베이스라인에서 동일하게 재현 — 이 변경과 무관한 기존 문제.
