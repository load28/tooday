# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

이 파일은 인덱스만 둔다 — 실제 내용은 각 문서를 읽는다. 예외는 명령어 하나뿐이다
(README 스크립트가 다루지 않는 테스트·경계 검사).

## 명령어

Bun workspaces + Turborepo 모노레포. 루트에서 실행한다. 개발·빌드·타입체크·포맷 등
기본 스크립트는 [README.md](README.md) "Scripts"에 있고, 아래는 거기 없는 것들이다.

```bash
bun run test        # 전체 테스트 (turbo run test — bff는 bun test, web/design-guide는 vitest)
bun run lint:deps   # dependency-cruiser 경계 검사 (CI·pre-commit이 강제하는 의존 방향)
```

단일 테스트 — 앱별 러너가 다르다:

```bash
cd apps/bff && bun test src/modules/auth/access-token.test.ts   # bun test (파일)
cd apps/bff && bun test -t "rotates"                            # bun test (이름 필터)
cd apps/web && bunx vitest run src/shared/time.test.ts          # vitest (파일)
cd apps/web && bunx vitest -t "formats"                         # vitest (이름 필터, watch)
```

커밋 전 lefthook pre-commit이 스테이징 파일에 `biome check --write` + `lint:deps`를 건다.

## 프로젝트 이해

- [README.md](README.md) — 아키텍처, 디렉토리 전략(도메인 수직 슬라이스 + 헥사고날
  라이트, 의존 방향), 스택, 스크립트. 작업 전 반드시 읽는다.
- [docs/authentication-architecture.md](docs/authentication-architecture.md) — 인증 구조.
- [docs/task-sharing-architecture.md](docs/task-sharing-architecture.md) — 태스크 공유 설계 제안
  (미구현). 지금 동기화 원리(스냅샷+seq+tombstone+커서)를 재사용해 채팅 공유·변경 반영을 얹는 방법.

## 태스크 관리 (docs/tasks/)

**모든 작업은 태스크 문서로 시작한다.** 새 지시를 받으면 코드를 만지기 전에
[docs/tasks/index.md](docs/tasks/index.md)의 규칙대로
[\_template.md](docs/tasks/_template.md)를 복사해 태스크 파일부터 만든다 —
하나의 태스크 = 하나의 파일, 해당 대화를 원문으로 기록, 완료 시 상태·커밋을
기입하고 인덱스 표를 갱신한다.

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
- [web-cache-policy.md](docs/conventions/web-cache-policy.md) — 뮤테이션 후 캐시 갱신
  전략 4가지의 선택 기준, 낙관적 패치 헬퍼(`optimisticPatch`) 배선, 에러 표면화,
  queryKey 파생(`trpc.x.queryKey(input)`) 통일.
- [git-commits.md](docs/conventions/git-commits.md) — **절대 규칙.** 커밋은 태스크 단위로
  하고 제목 끝에 `(T0XX)`로 태스크 번호를 명시한다. 영어 conventional 제목 + 한국어
  "한다"체 본문, AI attribution 금지.

새 컨벤션이 생기면 docs/conventions/에 문서를 추가하고 여기 인덱스에 한 줄로 등록한다.
