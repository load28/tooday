# `gcTime: 0` 하나가 만든 빈 화면 — TanStack Query의 stale과 gc를 다시 이해하기

> 칸반 일정 앱 TooDay를 만들다 겪은 이야기다. 탭을 전환할 때마다 화면이 잠깐
> 멈췄다가 **빈 화면**을 거쳐 그려졌다. 원인을 좇아가 보니 `QueryClient`에
> 무심코 박혀 있던 `staleTime: 0, gcTime: 0` 한 줄이었고, 그걸 고치는 과정에서
> TanStack Query의 캐시 수명 두 축을 처음으로 제대로 이해하게 됐다.

## 증상: SSR인데 왜 탭이 깜빡이지?

TooDay 웹은 TanStack Start(SSR) 위에 올라가 있다. `/today`(시간 뷰)와
`/projects`(보드)는 하단 탭으로 오간다. 그런데 탭을 누르면 부드럽게 바뀌는 게
아니라, 화면이 한 박자 멈추고 **위쪽 전체가 하얗게 비었다가** 데이터가 채워졌다.
탭바까지 같이 사라졌다.

첫 의심은 SSR이었다. 하지만 SSR은 **첫 문서 한 번**만 관여한다. 하이드레이션
이후 탭 전환은 100% 클라이언트 라우팅이라 서버 렌더와는 무관하다. 범인은 다른
데 있었다.

## 두 개의 창구: loader와 컴포넌트는 캐시를 다르게 읽는다

TooDay에서 한 화면의 데이터는 **서로 다른 두 주체**가 읽는다. 이 둘의 규칙 차이가
이 사건의 핵심이라 먼저 짚는다.

| 창구 | 캐시에 데이터가 있을 때 | 데이터가 없을 때 |
| --- | --- | --- |
| 라우트 loader의 `ensureQueryData` | `staleTime`과 무관하게 **즉시 반환** (구독을 안 만든다) | fetch 후 대기 |
| 컴포넌트의 `useSuspenseQuery` | 즉시 렌더 + 낡았으면 백그라운드 갱신 | **suspend** |

라우트 loader는 `ensureQueryData`로 화면 진입 전에 캐시를 채워 둔다. 그리고
컴포넌트는 `useSuspenseQuery`로 그 캐시를 읽어 그린다. 정상 흐름이라면 loader가
채운 데이터를 컴포넌트가 곧바로 받아 suspend 없이 렌더해야 한다.

문제는 `ensureQueryData`가 **관찰자(observer)를 만들지 않는다**는 점이다. loader가
캐시를 채운 직후, 그 쿼리를 구독하는 컴포넌트는 아직 마운트되지 않았다. 즉 그
순간 캐시의 관찰자 수는 **0**이다.

## `gcTime`은 "관찰자가 0이 된 캐시를 언제 버리는가"다

여기서 `gcTime`이 등장한다. `gcTime`(garbage collection time)은 **관찰자가 0이 된
캐시를 메모리에서 버리기까지 기다리는 시간**이다. TanStack Query v5 기본값은
5분이다.

우리 `QueryClient`엔 이렇게 박혀 있었다:

```ts
// apps/web/src/app/trpc.ts (변경 전)
new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0, gcTime: 0 },
  },
});
```

`gcTime: 0`. 관찰자가 0이 되는 즉시 캐시를 버린다는 뜻이다. 그러면 이런 순서가
벌어진다.

1. loader가 `ensureQueryData`로 `task.range` 캐시를 채운다. 관찰자는 0.
2. `gcTime: 0`이라 gc 타이머가 즉시 발화 → **다음 매크로태스크에 캐시가 통째로
   삭제**된다.
3. 그 사이 컴포넌트가 마운트되고 `useSuspenseQuery`가 캐시를 읽는다 — **없다.**
4. 데이터가 없으니 `useSuspenseQuery`가 **suspend**한다.
5. 라우터는 각 라우트 매치를 `<Suspense>`로 감싸는데, `router.tsx`에
   `defaultPendingComponent`가 없어 fallback이 비어 있다 → **화면 전체가 빈다.**

탭바까지 사라진 이유는 탭바가 데이터를 읽는 컴포넌트의 반환값(`Screen`의
`bottomBar` 슬롯) 안에 있어 Suspense 경계 **안쪽**이었기 때문이다.

정리하면 탭 전환 1회당 `task.range`를 **두 번** 받았다. loader에서 한 번,
suspend를 복구하며 한 번. 둘 다 블로킹이었다. 캐시를 버리라고 시켜 놨으니
캐시가 있을 리 없고, 매 전환이 네트워크 왕복에 묶였다.

## 그런데 이 `gcTime: 0`은 누가 왜 넣었나

고치기 전에 근거부터 찾았다. 의도된 설정이라면 이유가 있을 테니까.

- `git log -S"gcTime" --all` → 커밋 하나. 그마저도 **리포지토리 루트 커밋**(전체
  코드가 squash되어 들어온 초기 임포트)이라 이 설정에 대한 결정 기록이 없었다.
- 오히려 **정면으로 모순되는 설계 문서**가 있었다. 인증 아키텍처 문서는 "캐시에
  데이터가 있으면 즉시 반환 → 네트워크 안 탐 → **네비게이션 블로킹 제로**"를
  명시한다. `gcTime: 0`이면 캐시가 항상 비어 있어 이 시나리오는 성립할 수 없다.
- `today-screen.tsx`의 주석 "loader가 `ensureQueryData`로 채워 두므로 첫 렌더에서
  suspend 하지 않는다"도 `gcTime: 0` 때문에 **거짓**이었다.
- 동기화 설계와도 어긋났다. 실시간 델타 동기화 코드(`use-task-sync`)의 `pull()`은
  캐시가 비면 즉시 리턴하는데, `gcTime: 0`이면 화면 재진입 시 캐시가 없어
  **커서·델타 경로가 한 번도 동작하지 않았다**. 캐시를 살려야 그 기계장치가 처음
  쓰인다.

즉 `gcTime: 0`은 설계 의도가 아니라 **초기 임포트에 섞여 들어온 사고**였고, 앱의
여러 설계를 조용히 죽이고 있었다.

## 첫 진단이 틀렸다: 멈칫의 범인은 `staleTime`이 아니다

여기서 나도 한 번 헛다리를 짚었다. "전환할 때 멈칫하는 건 `staleTime: 0`이라
매번 새로 요청해서 아닌가?" 싶어 `staleTime: 30초`를 제안했다. 틀렸다.

`ensureQueryData`는 **데이터가 있으면 `staleTime`과 무관하게 즉시 반환**하고,
없을 때만 fetch한다(v5는 `revalidateIfStale`가 기본 false라 stale이어도 재검증을
안 건다). 멈칫도 빈 화면도 원인은 전부 `gcTime: 0` **하나**였다. 캐시만 살아
있으면 loader는 네트워크 없이 즉시 반환하고 멈칫이 사라진다.

`staleTime`을 올리는 건 오히려 손해였다. `staleTime`을 0으로 두면 캐시로 즉시
렌더한 뒤 마운트 트리거에서 **백그라운드 재검증**이 돈다(stale-while-revalidate).
과거 데이터를 보는 창이 `gcTime`(5분)이 아니라 **재검증 왕복 시간(수백 ms)**으로
묶인다. `staleTime`을 올리면 딱 그만큼 진짜 묵은 데이터를 더 오래 본다.

## `staleTime`은 요청을 만드는 스위치가 아니다

이게 두 번째 큰 오해였다. "`staleTime: 0`이면 계속 요청하는 거 아냐?"

아니다. **`staleTime`은 요청을 만들지 않는다.** 갱신을 일으키는 건 트리거다:

- `refetchOnMount` — 컴포넌트가 마운트될 때
- `refetchOnWindowFocus` — 창이 다시 포커스될 때
- `refetchOnReconnect` — 네트워크가 복구될 때
- `invalidateQueries` — 명시적 무효화

그리고 폴링(`refetchInterval`)은 꺼져 있다. `staleTime`은 이 트리거가 왔을 때
**통과시킬지 거를지 결정하는 스로틀**이다. `staleTime: 0`은 "계속 요청하라"가
아니라 "재요청 기회(트리거)가 오면 막지 마라"는 뜻이다. 가만히 있으면 요청은
**0건**이다.

오히려 `gcTime: 0`인 상태가 탭 전환당 2건(둘 다 블로킹)을 쐈고, 고친 뒤엔
1건(논블로킹 백그라운드)으로 줄었다.

## 진짜 규칙: 관찰자가 없는 쿼리는 `gcTime > staleTime`

이제 `staleTime: 0, gcTime: 0` 두 줄을 **지우기만** 하면 됐다. 명시하지 않으면
v5 기본값(`staleTime` 0 / `gcTime` 5분)이 적용된다. 기본값과 같은 값을 굳이 쓸
이유가 없다.

그런데 세션 게이트 쿼리 `user.me`는 사정이 달랐다. 이건 매 네비게이션마다 BFF가
세션 라이브니스를 확인하는, 싸지 않은 요청이다. 그래서 이 쿼리에만 `staleTime`을
길게(15분) 주기로 했다. 여기서 함정에 빠질 뻔했다.

`user.me`를 **구독하는 컴포넌트가 하나도 없다.** loader의 `ensureQueryData`와
로그인·회원가입의 `setQueryData`만 캐시를 만진다. 관찰자가 없으면
`refetchOnMount`를 발동시킬 주체가 없다. 그래서 TanStack Query 소스를 직접
확인했다. gc 타이머가 리셋되는 지점은 딱 세 곳이다
(`query-core/src/removable.ts`, `query.ts`):

1. 쿼리 생성자
2. `removeObserver()` — 마지막 관찰자가 떨어질 때
3. **`fetch()`의 finally** — 백그라운드 갱신이 끝날 때

관찰자가 없는 `user.me`는 **오직 백그라운드 fetch만이** gc 타이머를 리셋할 수
있다. 그런데 `staleTime`이 `gcTime`보다 크면, 그 기간 동안 캐시가 fresh라 fetch가
안 일어나고 → gc 타이머가 리셋될 기회도 없고 → `gcTime` 시점에 캐시가 먼저
삭제된다. 그러면 다음 진입이 **블로킹 fetch**가 된다. 애써 늘린 `staleTime`이
정반대로 작동하는 것이다.

> **규칙: 구독하는 컴포넌트가 없는 쿼리는 `gcTime > staleTime`이어야 한다.**
> `staleTime`이 `gcTime`을 넘은 초과분은 언제나 무의미하다.

그래서 `user.me`는 `staleTime 15분` / `gcTime 30분` / `revalidateIfStale: true`로
정했다.

```ts
// apps/web/src/app/trpc.ts (변경 후)
const SESSION_STALE_MS = 15 * 60_000;
const SESSION_GC_MS = 30 * 60_000; // 반드시 STALE보다 커야 한다

queryClient.ensureQueryData({
  ...trpc.user.me.queryOptions(),
  staleTime: SESSION_STALE_MS,
  gcTime: SESSION_GC_MS,
  revalidateIfStale: true, // 캐시는 즉시 반환(네비 블로킹 0), 낡았으면 뒤에서만 재확인
});
```

`revalidateIfStale: true`가 `ensureQueryData`에 "캐시는 즉시 줘서 내비게이션을
막지 말고, 낡았으면 백그라운드로만 세션을 재확인하라"를 시킨다. 문서가 약속한
"네비게이션 블로킹 제로"가 이제야 참이 된다.

### 15분이나 낡아도 되나? — 폐기는 주기가 아니라 이벤트로 잡는다

`staleTime`을 15분으로 늘리면 세션 폐기 감지도 15분 늦어지는 게 아닌가 싶다.
그래서 감지를 **주기**가 아니라 **이벤트**로 옮겼다. 액세스 토큰이 만료돼
refresh까지 실패하면 = 세션이 죽었으면, 그 자리에서 `user.me` 캐시를 지운다.

```ts
// refresh까지 실패 = 세션이 죽었다. 게이트 캐시를 버려 다음 beforeLoad가
// 곧바로 로그인 리다이렉트하게 한다 — 폴링 주기를 기다리지 않는다.
onSessionLost(); // queryClient.removeQueries({ queryKey: trpc.user.me.queryKey() })
```

캐시가 비면 다음 `beforeLoad`의 `ensureQueryData`가 fetch → 401 → `null` →
기존 리다이렉트 로직이 `/login`으로 보낸다. 폴링 주기를 좁히는 대신 실제 거부
이벤트에 반응하는 것 — Entra CAE나 OIDC Back-Channel Logout이 택한 방향의
축소판이다. 이 이벤트 감지가 있어야 15분이라는 느슨한 주기가 정당해진다.

## 캐시를 살렸더니 깨진 것: "머물면 invalidate, 떠나면 remove"

`gcTime: 0`은 사실 **버그이자 목발**이었다. 캐시가 항상 비어 있던 덕분에 우연히
성립하던 코드가 있었다. 캐시를 살리자 그게 드러났다.

화면을 **떠나는** 뮤테이션 두 곳 — `task.create`(생성 후 `/today`로),
`task.delete`(삭제 후 `/today`로) — 은 `invalidate` 없이 `navigate`만 했다.
`gcTime: 0`일 땐 캐시가 없어 다음 화면 loader가 늘 새로 채웠으므로 문제가
없었다. 하지만 캐시가 살아 있으면 loader의 `ensureQueryData`가 **옛 스냅샷을 즉시
반환**한다. 방금 만든 태스크가 없는 화면, 방금 지운 태스크가 남은 화면이 뜬 뒤
수백 ms 후에야 바뀐다.

여기서 `invalidateQueries`는 **안 통한다.** invalidate는 "낡음 표시 + 활성 관찰자
재요청"인데, loader의 `ensureQueryData`는 낡음을 무시하고 있으면 그냥 준다.
떠나는 경우엔 캐시를 **비워야(`removeQueries`)** loader가 실제로 새로 채운다.

그렇다고 전부 `removeQueries`로 바꾸면 또 깨진다. 화면에 **머무는** 뮤테이션에서
캐시를 지우면, 그 캐시를 구독 중인 `useSuspenseQuery`가 데이터를 잃고 suspend해
**화면이 빈다** — `gcTime: 0`이 자동으로 하던 그 짓을 손으로 하는 셈이다.

갈림길은 "뮤테이션이 성공했나"가 아니라 **다음에 그 데이터를 읽는 주체가
누구냐**다.

> **화면에 머물면 `invalidateQueries`, 화면을 떠나면 `removeQueries`.**
>
> - 머무름 → 다음에 읽는 건 구독 중인 컴포넌트(창구 B). 낡음 표시만으로 재요청이
>   걸리고, 데이터는 남아 있어 화면이 안 깨진다.
> - 떠남 → 다음에 읽는 건 다음 화면의 loader(창구 A). `ensureQueryData`가 낡음을
>   무시하므로 비워야 새로 채운다.

디테일 하나: 삭제 화면이 스스로 구독 중인 캐시(삭제한 태스크의 `task.byId`)는
`navigate`를 **await한 뒤**(언마운트 후)에 지운다. 마운트된 채로 지우면 위의
suspend가 나기 때문이다. 안 지우면 삭제 후 뒤로가기 시 loader가 지워진 태스크를
캐시에서 꺼내 보여준다.

## 정리 — 기본값을 쓰되, 두 축을 분리해서 이해하라

이 사건에서 건진 정신 모델은 이렇다.

1. **`staleTime`과 `gcTime`은 다른 축이다.** `staleTime`은 "이 데이터를 신선하다고
   볼 유통기한"(재검증 트리거를 거르는 스로틀), `gcTime`은 "관찰자가 0이 된 캐시를
   버릴 시점"(수명). 유통기한과 폐기 시점을 헷갈리면 설정이 정반대로 작동한다.
2. **`staleTime`은 요청을 만들지 않는다.** 요청은 트리거(mount/focus/reconnect/
   invalidate)가 만들고, 폴링을 끄면 가만히 있을 때 요청은 0건이다. `staleTime: 0`은
   "계속 요청"이 아니라 "재검증 기회가 오면 막지 마라"다.
3. **전역은 기본값(`staleTime` 0 / `gcTime` 5분)을 쓰고, 예외는 쿼리 단위로 준다.**
   `staleTime: 0`은 stale-while-revalidate를 켜서 과거 데이터를 보는 창을 재검증
   왕복(수백 ms)으로 묶는다. 수명을 늘려야 할 쿼리(`user.me` 같은 게이트)만 그
   쿼리에서 따로 늘린다.
4. **구독자가 없는 쿼리는 반드시 `gcTime > staleTime`.** gc 타이머는 백그라운드
   fetch로만 리셋되는데, 관찰자가 없으면 그 fetch가 안 일어나므로 `staleTime`이 더
   크면 캐시가 갱신 전에 삭제돼 블로킹 요청이 생긴다.
5. **뮤테이션 후 캐시 갱신은 "머물면 invalidate, 떠나면 remove".** `ensureQueryData`
   는 낡음을 무시하므로, 떠나는 화면엔 invalidate가 안 통한다.

`gcTime: 0` 한 줄이 지우려던 건 캐시 한 조각이 아니라, 그 위에 세운 즉시 렌더·
백그라운드 재검증·델타 동기화·세션 게이트 설계 전체였다. 캐시 수명 두 값은 작아
보이지만, 앱이 데이터를 어떻게 보여줄지에 대한 계약 그 자체다.

---

## 참고 문헌

- [Official] TanStack Query v5 — Important Defaults (`staleTime` 0 / `gcTime` 5분)
- [Source] TanStack Query `query-core/src/removable.ts`, `query.ts` — `scheduleGc()`
  호출 지점(생성자 / `removeObserver` / `fetch`의 finally)
- [Official] Auth0 — Configure Silent Authentication (`checkSession()` 폴링 최소 15분)
- [Official] Microsoft Entra — Continuous Access Evaluation (이벤트 기반 near-real-time 폐기)
- [Standard] NIST SP 800-63B — 재인증 주기(AAL2 12시간 / 30분 비활성)
- 이 글의 실제 작업 기록: `docs/tasks/T029-web-cache-lifetime.md`
