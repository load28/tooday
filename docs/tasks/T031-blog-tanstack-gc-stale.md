# T031 — 블로그 작성: TanStack Query gc/stale 설정 (T029 경험 기반)

- 상태: 완료
- 생성: 2026-07-26
- 완료: 2026-07-26

## 배경

T029(탭 전환 빈 화면·멈칫 제거)에서 `gcTime: 0` 한 줄이 loader의
`ensureQueryData`가 채운 캐시를 컴포넌트 마운트 전에 GC시켜 빈 화면을 만드는 것을
규명했다. 그 과정에서 `staleTime`/`gcTime`의 동작 원리(두 창구의 규칙 차이, gc
타이머 리셋 지점, `gcTime > staleTime` 규칙, "머물면 invalidate 떠나면 remove")를
정리했고, 이 경험을 외부에 공유할 블로그 글로 남기고 싶다는 요청.

근거 소스:

- `docs/tasks/T029-web-cache-lifetime.md` — 전체 조사·결정·대화 원문
- `docs/conventions/web-cache-policy.md` — 캐시 정책 4전략 + 수명 규칙
- `apps/web/src/app/trpc.ts` — 실제 구현(`SESSION_STALE_MS`/`SESSION_GC_MS`,
  `fetchWithRefresh`의 세션 상실 콜백)
- `docs/research/2026-07-04-validation-message-separation.md` — 하우스 글 스타일

## 작업 내용

`docs/blog/2026-07-26-tanstack-query-gc-stale.md` 신설. T029 경험을 서사로 재구성한
기술 블로그.

- 증상(SSR인데 탭 전환 시 빈 화면) → 두 창구(loader `ensureQueryData` vs 컴포넌트
  `useSuspenseQuery`)의 캐시 읽기 규칙 차이 → `gcTime: 0`이 빈 화면을 만드는 메커니즘
- 근거 조사(의도된 설정이 아님) + 첫 진단 오류(`staleTime` 지목) 정정
- `staleTime`은 요청 스위치가 아니라 트리거 스로틀
- 핵심 규칙: 관찰자 없는 쿼리는 `gcTime > staleTime` (gc 타이머 리셋 지점 근거)
- `user.me` 예외 처방 + 폐기를 이벤트로 감지(`fetchWithRefresh`)
- 전략 ④ 파손과 "머물면 invalidate, 떠나면 remove"
- 정리 5원칙

블로그이므로 `docs/blog/`를 신설(기존 `docs/research/`는 내부 기술조사 자리라 구분).
날짜-슬러그 파일명은 research 관행을 따른다.

## 완료 기준

- [x] `docs/blog/2026-07-26-tanstack-query-gc-stale.md` 작성
- [x] T029/컨벤션/실제 코드와 사실 정합(수치·메커니즘·파일 경로)
- [x] 인덱스 표에 T031 등록

## 대화 기록

> **사용자**: 탠스택쿼리의 gc와 stale 설정값에 대해 이 프로잭트의 경험 기반으로
> 블로그르루작성하고싶다
>
> **Claude**: 프로젝트에서 `gcTime`/`staleTime`을 실제로 어떻게 쓰는지부터 조사.
> T029 태스크 문서에 전체 경험(빈 화면 원인 규명, gc/stale 동작 원리, 두 창구,
> `gcTime > staleTime` 규칙, 머물면 invalidate 떠나면 remove)이 원문 대화까지
> 남아 있음을 확인. 이를 재료로 `docs/research`의 하우스 스타일을 따라 블로그
> (`docs/blog/2026-07-26-tanstack-query-gc-stale.md`)를 작성. 커밋 컨벤션(태스크
> 번호 절대 규칙)을 지키기 위해 이 태스크 문서 T031을 함께 생성.

## 작업 로그

- 2026-07-26: 태스크 생성 + 블로그 작성. 코드 변경 없음(문서만). typecheck/test
  영향 없음.
