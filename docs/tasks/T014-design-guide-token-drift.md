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
> **Claude** (조사 보고 중): "design-guide는 토큰 전체를 raw hex로 재선언한 병렬
> 사본인데 successSoft·primaryHover 등이 web과 이미 다른 값 — 프로토타입이 시각
> 원본이라면 어긋난 상태."
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
