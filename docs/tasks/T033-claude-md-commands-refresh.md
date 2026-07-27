# T033 — CLAUDE.md 최신화 + 명령어 인덱스 보강

- 상태: 완료
- 생성: 2026-07-27
- 완료: 2026-07-27

## 배경

CLAUDE.md는 "인덱스만 둔다" 원칙으로 각 문서를 가리키는 파일이다. 인덱스 자체는
최신 상태(컨벤션 6종, 태스크 T032까지, 아키텍처 문서)와 일치했으나, 두 가지 공백이 있었다.

- Claude Code(claude.ai/code) 표준 프리앰블 헤더가 없었다.
- 명령어가 어디에도 온전히 문서화되지 않았다. [README.md](../../README.md) "Scripts"는
  dev/build/typecheck/check/format/infra만 다루고, `test`·단일 테스트·`lint:deps`
  (`package.json:13-16`)는 빠져 있었다. 앱별 테스트 러너가 갈린다는 사실
  (bff=`bun test`, web/design-guide=`vitest`, `apps/*/package.json`)도 어디에도 없었다.

## 작업 내용

- CLAUDE.md 최상단에 표준 프리앰블 헤더를 추가한다.
- README가 다루지 않는 것만 담는 "명령어" 섹션을 신설한다: `bun run test`,
  `bun run lint:deps`, 그리고 앱별로 갈리는 단일 테스트 실행법(bun test / vitest).
  나머지 기본 스크립트는 README로 위임해 인덱스 원칙을 유지한다.
- 기각: 아키텍처·디렉토리 전략을 CLAUDE.md에 복제하는 안. "인덱스만 둔다" 원칙과
  단일 출처(README) 원칙을 깨므로 하지 않는다.

## 완료 기준

- [x] 프리앰블 헤더 존재
- [x] README에 없는 명령어(test·단일 테스트·lint:deps) 문서화
- [x] 문서화한 명령어 문법 검증 (deps 미설치 환경이라 실행은 불가 — 문법 확인)
- [x] 인덱스 표 갱신

## 대화 기록

> **사용자**: Analyze this repository and create a comprehensive CLAUDE.md file that
> explains the codebase structure, development workflows, and key conventions for AI
> assistants to follow. If one already exists, update it with the most recent state
>
> **Claude**: 기존 CLAUDE.md는 의도된 인덱스 파일이고 참조 대상(컨벤션·태스크·아키텍처)이
> 최신 상태와 일치했다. 실제 공백은 명령어였다 — README Scripts가 test·단일 테스트·
> lint:deps를 빠뜨렸다. 인덱스 원칙을 지키되 표준 프리앰블 헤더와 그 공백만 채우는
> 명령어 섹션을 추가했다.

## 작업 로그

- 2026-07-27: CLAUDE.md에 프리앰블 헤더 + 명령어 섹션 추가, 본 태스크 문서 신설,
  인덱스 표에 T033 추가. deps 미설치로 실제 테스트 실행은 불가해 명령 문법만 확인했다.
