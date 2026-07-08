# T014 — design-guide 토큰 드리프트 해소

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
- 커밋: -

## 배경

`apps/design-guide`는 shared/ui·panda를 쓰지 않고 전체 토큰을
`src/lib/tokens.ts`에 raw hex로 재선언한 병렬 프로토타입이다. 프로토타입이라는
지위는 인정되지만, 값이 web `panda.config.ts`와 이미 어긋났다:

- `successSoft: '#e8f8f4'` (tokens.ts:24) vs web `mint.100 = #dff7f2`
- `primaryHover: '#2272eb'` (brand.600) vs web 프레스 색 `primaryPressed = brand.700 = #1e63cf`
- `PROJECT_COLOR_SOFT.gray: '#eef0f3'` (tokens.ts:68) — web에 대응 없음

design-guide가 시각적 원본(source of truth)이라면 레퍼런스와 실제 앱이 성공/프레스/
소프트 색에서 불일치하는 상태다. 또한 web의 WeekStrip에 design-guide에서 복사된
raw rgba가 남아 있다(T008에서 처리).

## 작업 내용

먼저 design-guide의 지위를 결정한다:
- **시각 원본으로 유지** → 토큰 값을 web panda.config와 동기화하고, 드리프트 방지
  방법(생성 스크립트나 대조 테스트) 검토.
- **폐기된 프로토타입** → README에서 지위를 명시하고 참조 대상에서 제외.

## 완료 기준

- [ ] design-guide의 지위가 문서화됨
- [ ] (유지 시) 토큰 값 불일치 0건

## 대화 기록

> **사용자**: 전체 디저인시스템의 아키텍처나 bff 설계 등등을 보고 체계적으로 잡힌게
> 아니라 예외적으로 만들어쟈있는부분을 찾아 개선하고싶음 먼저 찾아봐
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> **design-guide 토큰 드리프트**: `successSoft`, `primaryHover` 등이 web panda.config와
> 이미 다른 값. 프로토타입이 시각적 원본이라면 어긋난 상태.
>
> (디자인 시스템 조사 에이전트 보고 원문):
>
> **7. design-guide is a parallel token/primitive copy that has drifted** —
> `apps/design-guide` does not consume `shared/ui` or panda at all — it re-declares
> the entire token set as raw hex in `apps/design-guide/src/lib/tokens.ts` and
> rebuilds every primitive with raw `<button>`, inline `style={{...}}`,
> JS-conditional style objects, and hand-written resets. As a static prototype that's
> arguably its purpose, but the token values have measurably drifted from
> `apps/web/panda.config.ts`:
> - `successSoft: '#e8f8f4'` (tokens.ts:24) vs web `mint.100 = #dff7f2` — different.
> - `primaryHover: '#2272eb'` (brand.600) (tokens.ts:19) vs web's press color
>   `primaryPressed = brand.700 = #1e63cf` — different.
> - `PROJECT_COLOR_SOFT.gray: '#eef0f3'` (tokens.ts:68) has no web equivalent.
>
> If design-guide is still treated as the visual source of truth, this drift means the
> reference and the shipped app disagree on success/press/soft colors.
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
