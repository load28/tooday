# T011 — tRPC 프로시저 경로 문자열 하드코딩 제거

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
- 커밋: -

## 배경

`apps/web/src/app/trpc.ts`가 tRPC 프로시저 이름을 raw 문자열로 하드코딩:

- `:21` — `const REFRESH_URL = \`${BFF_URL}${TRPC_ENDPOINT}/auth.refresh\``
- `:24-27` — `isAuthEndpoint`가 `/auth\.(refresh|login|signup)/` 정규식으로 URL 매칭

BFF에서 프로시저가 리네임되면 컴파일 에러 없이 런타임에 깨진다 —
[type-safety.md](../conventions/type-safety.md)가 금지하는 "문자열 하드코딩" 지름길.
대비되는 올바른 패턴: `features/today/use-task-sync.ts:46`은 shared 계약 상수
`SYNC_EVENTS_PATH`로 URL을 만든다. (raw fetch 자체는 정당 — SSR 쿠키 포워딩과
refresh 단일 비행은 app/의 몫. 문자열 결합만 문제.)

## 작업 내용

`packages/shared`에 auth 관련 경로 상수(또는 라우터 타입에서 파생하는 헬퍼)를
선언하고 `app/trpc.ts`가 그것을 사용하게 한다 — `SYNC_EVENTS_PATH`와 같은 방식.

## 완료 기준

- [ ] `app/trpc.ts`에 프로시저 이름 raw 문자열 0건
- [ ] typecheck / web 테스트 통과

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (조사 보고 중): "tRPC 프로시저 경로가 문자열로 하드코딩 — 리네임 시
> 컴파일 타임에 안 잡힘. use-task-sync.ts의 SYNC_EVENTS_PATH가 올바른 대비 패턴."
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
