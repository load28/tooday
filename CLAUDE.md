# CLAUDE.md

아키텍처 · 디렉토리 전략 · 스크립트는 [README.md](README.md)를 먼저 읽는다.

## apps/web 컨벤션

### UI 스타일링 — className보다 variant 우선

- `shared/ui` 컴포넌트가 recipe로 관리하는 속성(padding, tone, size, radius 등)은
  반드시 해당 variant prop으로 지정한다. `css()` className으로 같은 속성을 덮지 않는다.
  - 이유: Panda 원자 클래스는 특이도가 같아 **스타일시트 생성 순서**로 승패가 갈린다.
    recipe 기본값(예: Card의 `padding: none` → `p_0`)이 className의 padding을 이겨
    스타일이 조용히 사라질 수 있다. 색(tone)도 동일하다.
- className은 recipe가 다루지 않는 속성에만 쓴다 — 배치·레이아웃(margin, display,
  flex/grid, gap 등)이 대표적이다.
- 필요한 variant가 없으면 사용처에서 css로 덮지 말고 `shared/ui` 컴포넌트에
  variant를 추가한 뒤 쓴다.

### i18n — 스키마 우선, 컴파일 타임에 어긋남을 잡는다

- 화면에 노출되는 모든 문구(aria-label 포함)는 하드코딩하지 않고
  `shared/i18n/schema.ts`의 `MessageSchema`에 `Msg` / `Msg<'param'>`으로 먼저 선언한다.
- locale 사전(`ko.ts` 등)은 반드시 `defineMessages<MessageSchema>()`로 빌드한다 —
  키 누락/초과, 선언에 없는 `{플레이스홀더}`, 파라미터 이름 오타가 해당 잎에서
  컴파일 에러로 잡힌다.
- 플레이스홀더 치환은 `format()`만 쓴다 — 요구 파라미터가 스키마 브랜드 타입에서
  추론되므로 빠뜨리거나 이름이 틀리면 tsc가 잡는다. 문자열 연결·수동 replace 금지.
- 이 타입 추론 체계를 우회하는 코드(`as string` 캐스팅, `Record<string, string>` 사전,
  스키마를 거치지 않는 문구 모듈)를 추가하지 않는다. 새 문구·새 locale 모두
  스키마에서 파생시켜 컴파일 타임 검증을 유지한다.
