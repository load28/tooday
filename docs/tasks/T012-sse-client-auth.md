# T012 — SSE 클라이언트 auth 경로 정리

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
- 커밋: -

## 배경

`apps/web/src/features/today/use-task-sync.ts`는 feature 층에서 유일한
useEffect/EventSource 코드다 (SSE 특성상 불가피). 다만:

- EventSource(`:46`, `withCredentials: true`)는 모든 tRPC 요청이 타는
  `fetchWithRefresh` 401→refresh 단일 비행(`app/trpc.ts:56-64`)에 참여하지 못한다.
  액세스 쿠키가 스트림 중 만료되면 클라이언트 측 refresh 경로가 없고 재연결에만
  의존 — 나머지 클라이언트와 다른 예외적 auth 경로.
- `BFF_URL`을 `app/trpc.ts`에서 import 해 URL을 손으로 조립 — base URL 배선이
  tRPC 클라이언트 설정 밖으로 새는 유일한 곳.
- effect deps(`:53`)에 `range`와 `range.from`/`range.to`가 중복.

## 작업 내용

1. 만료 시 재연결 의존을 허용할지 결정: 허용하면 그 이유를 코드 주석으로 명시,
   아니면 SSE 에러 시 refresh 후 재구독 로직 추가.
2. base URL 배선을 한 곳으로 (BFF_URL 노출 방식 재검토).
3. effect deps 중복 정리.

## 완료 기준

- [ ] SSE auth 만료 동작이 의도된 설계로 문서화되거나 refresh 경로 추가
- [ ] typecheck 통과, 동기화 동작 확인(/verify 스킬)

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (조사 보고 중): "SSE EventSource는 401→refresh 단일 비행에 참여하지 못해
> 액세스 쿠키 만료 시 재연결에만 의존 — 나머지 클라이언트 대비 예외적 auth 경로.
> BFF_URL 손 조립, effect deps 중복도 함께."
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
