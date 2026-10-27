# T045 — TanStack Start 최신 버전 업데이트

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-10-11
- 완료: 2026-10-11

## 배경

`@tanstack/react-start`가 1.168.27에 머물러 있다(`apps/web/package.json`,
`apps/design-guide/package.json`). 2026-10-10 기준 최신은 1.168.61이다. Start는
router·router-plugin·devtools와 함께 릴리스되므로 같은 계열을 함께 올린다.

TanStack 의존성은 정확 버전으로 핀하고, web과 design-guide는 같은 버전을 공유한다.
업데이트 전 GitHub Advisory를 확인한다.

## 작업 내용

두 워크스페이스에서 아래 패키지를 npm `latest`로 정확 핀한다.

| 패키지 | 이전 | 이후 |
| --- | --- | --- |
| @tanstack/react-start | 1.168.27 | 1.168.61 |
| @tanstack/react-router | 1.170.17 | 1.170.42 |
| @tanstack/router-plugin | 1.168.19 | 1.168.43 |
| @tanstack/react-router-devtools | 1.167.0 | 1.167.2 |
| @tanstack/react-router-ssr-query (web) | 1.167.1 | 1.167.3 |
| @tanstack/react-devtools | 0.10.8 | 0.10.13 |
| @tanstack/devtools-vite | 0.8.1 | 0.8.5 |
| @tanstack/react-query (web, caret 하한) | ^5.101.2 | ^5.104.1 |

DB·Query·Form·Store는 Start와 릴리스 계열이 달라 범위에서 제외한다.
호환성 문제(타입 오류, 라우트 트리 생성 차이, 빌드 실패)가 나오면 코드를 맞춘다.

`react-router-ssr-query` 1.167.3이 `@tanstack/react-query`·`query-core >=5.102.0`을 peer로
요구하므로 react-query 하한을 올리고, lockfile의 query-core를 한 벌(5.104.1)로 합친다.
두 벌이 남으면 SSR 쿼리 통합이 다른 QueryClient 구현을 보게 된다.

## 완료 기준

- [x] 두 워크스페이스의 TanStack Start 계열이 같은 정확 버전으로 핀됨
- [x] GitHub Advisory에 대상 버전이 해당하지 않음
- [x] `bun run typecheck`, `bun run lint`, web·design-guide `vite build`, web·bff 테스트 통과

## 대화 기록

> **사용자**: 탠스택 스타트를 최신버전으로 업데이트해보고 호환성을 고려해서 코드를 수정해봐

## 작업 로그

- 2026-10-11: GitHub Advisory 확인 — GHSA-g7cv-rxg3-hmpx(멀웨어) 대상 버전 목록과
  GHSA-9m65-766c-r333(`start-server-core < 1.167.30`) 모두 이후 버전에 해당하지 않음.
- 2026-10-11: 버전 핀 갱신, react-query 하한 상향, lockfile query-core 단일화.
  라우트 트리 생성기 출력 순서 변경으로 `routeTree.gen.ts` 두 파일 재생성(내용 동일, 순서만).
  소스 코드 수정은 필요 없었다. 검증: `bun install --frozen-lockfile`, `bun run typecheck`,
  `bun run lint`, `bun run lint:deps`, web·design-guide `vite build` 통과, web 테스트 49개·
  bff 테스트 100개 통과(design-guide는 테스트 파일이 없어 vitest가 exit 1 — 기존 상태).
  Start 계열이 쓰는 seroval은 1.6.9로 GHSA-p6vx-979v-rg4c 패치 버전 이상.
