# CLAUDE.md

이 파일은 인덱스만 둔다. 실제 내용은 각 문서를 읽는다.

## 프로젝트 이해

- [README.md](README.md) — 아키텍처, 디렉토리 전략(도메인 수직 슬라이스 + 헥사고날
  라이트, 의존 방향), 스택, 스크립트. 작업 전 반드시 읽는다.
- [docs/authentication-architecture.md](docs/authentication-architecture.md) — 인증 구조.
- [docs/task-sharing-architecture.md](docs/task-sharing-architecture.md) — 태스크 공유 설계 제안
  (미구현). 지금 동기화 원리(스냅샷+seq+tombstone+커서)를 재사용해 채팅 공유·변경 반영을 얹는 방법.

## 컨벤션 (docs/conventions/)

- [ui-styling.md](docs/conventions/ui-styling.md) — shared/ui recipe가 관리하는 속성은
  className `css()`로 덮지 않고 variant prop으로 지정한다.
- [ui-composition.md](docs/conventions/ui-composition.md) — 새 인터랙티브 컴포넌트는
  Ark 프리미티브(상태·a11y) + 베이스 버튼 `BaseButton`(asChild) + 슬롯 오버레이
  (utilities 층)로 조립한다.
- [type-safety.md](docs/conventions/type-safety.md) — 계약을 한 곳에 선언하고 타입이
  정확히 추론되게 설계해 어긋남을 컴파일 타임에 잡는다 (예: i18n 스키마, satisfies 라우트 경로).
- [web-entities.md](docs/conventions/web-entities.md) — FSD는 전면 도입이 아니라 단위별
  점진 채택. 현재는 entities만 — 도메인 지식 + 여러 feature 공용 코드의 자리.

새 컨벤션이 생기면 docs/conventions/에 문서를 추가하고 여기 인덱스에 한 줄로 등록한다.
