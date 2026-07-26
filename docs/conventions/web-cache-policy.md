# web 캐시 정책 — 뮤테이션 후 캐시 갱신 전략

같은 코드베이스에 갱신 전략이 뮤테이션마다 제각각이면 "이 화면은 왜 안
바뀌지"를 매번 새로 추리해야 한다. 전략은 아래 4가지만 쓰고, 선택 기준을
따른다. 새 전략이 필요해지면 이 문서에 먼저 추가한다.

## 전략 4가지와 선택 기준

| 전략 | 언제 쓰나 | 현재 사용처 |
| --- | --- | --- |
| ① 낙관적 패치 + 롤백 + invalidate | 화면에 **이미 있는 데이터의 부분 수정**이고 즉각 반응이 UX의 일부일 때 (토글, 인라인 편집) | `task.update` (today·task-detail) |
| ② setQueryData prime | **뮤테이션 응답이 곧 쿼리 데이터**일 때 — 재요청 없이 캐시를 심는다 | `auth.login`·`auth.signup` → `user.me` |
| ③ invalidate만 | 응답만으로 캐시를 정확히 재구성할 수 없을 때 (서버 몫인 정렬·집계·목록 멤버십) | `task.createProject` → `task.projects` |
| ④ remove 후 navigate | 뮤테이션 후 **화면을 떠날 때** — 다음 화면 loader가 채우도록 그 캐시를 비운다 | `task.create`·`task.delete` → `/today` |

판단 순서: 화면을 떠나나? → ④. 응답이 쿼리 데이터 전체인가? → ②.
남아 있는 화면의 일부를 고치고 즉각성이 중요한가? → ①. 그 외 → ③.

## 머물면 `invalidate`, 떠나면 `remove`

①~③(머무름)과 ④(떠남)의 갈림길은 "뮤테이션이 성공했나"가 아니라 **다음에 그
데이터를 읽는 주체가 누구냐**다. 창구가 둘이고 규칙이 다르다.

| 창구 | 데이터가 있을 때 | 낡음 표시를 보나 |
| --- | --- | --- |
| 컴포넌트 `useSuspenseQuery` | 즉시 렌더 + 백그라운드 재검증 | **본다** (refetchOnMount) |
| 라우트 loader `ensureQueryData` | 즉시 반환, 재요청 없음 | **무시한다** |

- **화면에 머물면 `invalidateQueries`.** 다음에 읽는 건 구독 중인 컴포넌트라
  낡음 표시만으로 재요청이 걸린다. 데이터는 남아 있어 화면이 안 깨진다.
  여기서 `removeQueries`를 하면 구독 중인 `useSuspenseQuery`가 데이터를 잃고
  suspend 해 **화면이 빈다**.
- **화면을 떠나면 `removeQueries`.** 다음에 읽는 건 다음 화면의 loader인데,
  `ensureQueryData`는 낡음을 무시하고 캐시를 그대로 준다. 즉 `invalidate`가
  **안 통한다** — 비워야 loader가 실제로 새로 채운다.

떠나는 화면이 스스로 구독 중인 캐시(예: 삭제한 태스크의 `task.byId`)는
`navigate`를 await 한 **뒤에** 지운다. 마운트된 상태에서 지우면 위의 suspend가 난다.

## 캐시 수명 — 기본값을 쓰고, 예외는 쿼리 단위로

`QueryClient` 전역 기본값은 React Query 기본(`staleTime` 0 / `gcTime` 5분)을 쓴다.
`staleTime` 0은 "계속 요청"이 아니라 "재요청 기회가 오면 막지 마라"는 뜻이다 —
갱신은 트리거(`refetchOnMount` / `refetchOnWindowFocus` / `refetchOnReconnect` /
`invalidateQueries`)가 일으키고 폴링(`refetchInterval`)은 꺼져 있다. 덕분에 캐시로
즉시 렌더한 뒤 뒤에서 갱신돼, 과거 데이터를 보는 창이 재요청 왕복 시간으로 묶인다.

수명을 늘려야 하는 쿼리는 **전역이 아니라 그 쿼리에만** 준다
(`user.me` = 세션 게이트, `app/trpc.ts`의 `fetchSessionUser`).

**구독하는 컴포넌트가 없는 쿼리는 `gcTime > staleTime`이어야 한다.** gc 타이머는
생성자 / 마지막 관찰자 제거 / **fetch 완료** 시에만 리셋된다. 관찰자가 없으면
백그라운드 갱신(fetch)만이 타이머를 리셋할 수 있으므로, `gcTime`이 더 짧으면 갱신이
일어나기 전에 캐시가 삭제돼 다음 진입이 **블로킹 요청**이 된다. `staleTime`의
`gcTime` 초과분은 언제나 무의미하다.

`ensureQueryData`만 쓰는 쿼리(관찰자 없음)에 재검증이 필요하면
`revalidateIfStale: true`를 준다 — 캐시는 즉시 반환해 내비게이션을 막지 않고
백그라운드로만 갱신한다.

## ① 낙관적 패치는 헬퍼로 배선한다

cancel → snapshot → 캐시 패치 / 실패 시 롤백 / 정착 시 invalidate 삼단을
손으로 배선하지 않는다 — `shared/query.ts`의 `optimisticPatch`에 queryKey와
캐시 shape 반영 콜백만 넘긴다.

```ts
const update = useMutation(
  trpc.task.update.mutationOptions(
    optimisticPatch(queryClient, trpc.task.byId.queryKey({ id }), (old: { task: Task }, { patch }: UpdateTaskRequest) => ({
      task: applyTaskPatch(old.task, patch),
    })),
  ),
);
```

task 도메인의 "서버 흉내"(지정 필드 적용 + version 증가)는
`entities/task/patch.ts`의 `applyTaskPatch`가 담당한다 — 여러 feature가
공용하는 도메인 매핑이므로 entities 자리다
([web-entities.md](web-entities.md)).

낙관적 패치는 어디까지나 흉내다 — 서버 결과와의 최종 수렴은 `onSettled`
invalidate(①)와 sync 델타(`use-task-sync`)가 맡는다.

## 에러는 반드시 표면화한다

에러 처리 없는 뮤테이션을 두지 않는다. 실패가 사용자에게 보이는 경로가
하나는 있어야 한다.

- **폼 제출 뮤테이션** — `onSubmitAsync`에서 try/catch 후
  `formError(t.common.error.unexpected)` (도메인 에러는 코드별 필드 에러로
  매핑, `shared/form.ts`).
- **폼 밖 뮤테이션** (버튼 단독 등) — `mutation.isError`일 때
  `t.common.error.unexpected`를 danger Text로 표시 (task-detail의 삭제 버튼).
  낙관적 패치였다면 롤백(①의 onError)이 함께 동작한다.

## queryKey 파생은 `trpc.<proc>.queryKey(input)`로 통일

캐시 키가 필요한 곳(setQueryData, invalidateQueries, optimisticPatch, sync
패치)은 `trpc.task.range.queryKey(range)`처럼 파생한다.
`queryOptions(input).queryKey`로 같은 값을 얻을 수 있지만, 키 파생 용도로
`queryOptions()`를 만들지 않는다 — `queryOptions`는 쿼리를 구독/프리페치하는
자리에만 쓴다.
