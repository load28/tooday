# T013 — i18n 우회 문자열 이관

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-09
- 커밋: 7a38ada

## 배경

모든 화면이 `MessageSchema` 파생 사전(`useT()`)을 쓰는데, 사전 밖에 하드코딩된
사용자 노출 문자열이 남아 있다:

- `apps/web/src/router.tsx:9-10` — NotFound 부트스트랩의 `404` / `페이지를 찾을 수
  없습니다.` 한국어 하드코딩. `schema.ts`에 `notFound` 키 자체가 없음.
- `apps/web/src/shared/ui/button.tsx:98` — sr-only 로딩 라벨 `로딩 중`.
- `apps/web/src/shared/ui/spinner.tsx:9` — `label = '로딩 중'` 기본값.
  `common.loading` 키 없음. shared/ui는 shared/i18n과 같은 레이어라 소비 가능.

## 작업 내용

`shared/i18n/schema.ts`에 `notFound.*`, `common.loading` 키를 추가하고 locale
사전을 채운 뒤 세 곳을 이관한다. NotFound 컴포넌트가 i18n Provider 밖이라면
Provider 범위를 확인하고 필요한 배선을 추가한다.

## 완료 기준

- [ ] 사용자 노출 하드코딩 문자열 0건 (사전 파생만)
- [ ] typecheck 통과 (i18n 스키마가 키 누락을 컴파일 에러로 잡는지 확인)

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> **i18n 우회**: `router.tsx:9`의 404 화면 한국어 하드코딩, `Button`/`Spinner`의
> sr-only "로딩 중" — 사전에 키 없음.
>
> (레이어링·타입 안전성 조사 에이전트 보고 원문):
>
> **2. i18n bypass — hardcoded Korean in the NotFound bootstrap** —
> `apps/web/src/router.tsx:9-10` — `<h1>404</h1>` and `<p>페이지를 찾을 수 없습니다.</p>`
> are hardcoded user-facing strings. Every screen routes text through `useT()` / the
> `MessageSchema` dictionary, but this component hardcodes Korean directly. There is
> no `notFound` key in `schema.ts`, so this is a genuine bypass of the
> single-declaration i18n contract (not just a missing translation).
>
> **3. i18n bypass — hardcoded Korean a11y strings in the design system** —
> `shared/ui` is same-layer as `shared/i18n` and could consume it, but two primitives
> hardcode Korean screen-reader text: `shared/ui/button.tsx:98` — `로딩 중` (sr-only
> loading label); `shared/ui/spinner.tsx:9` — `label = '로딩 중'` default. No
> `common.loading` key exists in `schema.ts`.
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
