# T011 — tRPC 프로시저 경로 문자열 하드코딩 제거

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-09
- 커밋: 25c013e

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
> **Claude** (조사 중간 보고 원문): "그 외 i18n 우회(404 화면, Button/Spinner의 sr-only
> 한국어), tRPC 프로시저 경로 문자열 하드코딩(`auth.refresh`), 낙관적 업데이트 로직
> 복붙 등이 나왔습니다."
>
> (레이어링·타입 안전성 조사 에이전트 보고 원문):
>
> **4. Hardcoded tRPC procedure paths as strings (type-safety / contract coupling)**
> In the app shell, endpoint names are coupled to the tRPC router by raw string rather
> than derived:
> - `apps/web/src/app/trpc.ts:21` — `const REFRESH_URL =
>   \`${BFF_URL}${TRPC_ENDPOINT}/auth.refresh\`` hardcodes the procedure segment `auth.refresh`.
> - `apps/web/src/app/trpc.ts:24-27` — `isAuthEndpoint` matches
>   `/auth\.(refresh|login|signup)/` against the URL.
>
> If those procedures are renamed on the BFF, nothing fails at compile time — exactly
> the "문자열 하드코딩" shortcut the type-safety doc warns against. Contrast with the
> clean pattern in `features/today/use-task-sync.ts:46`, which builds its URL from the
> shared `SYNC_EVENTS_PATH` contract constant. The raw `fetch` calls themselves are
> legitimate (SSR cookie forwarding + refresh single-flight belong in `app/`), so this
> is a string-coupling issue, not a "bypass the tRPC client" issue.
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
