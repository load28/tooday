# T046 — TanStack Start 1.0 정식 버전으로 올리기

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-10-27
- 완료: 2026-10-27

## 배경

TanStack Start 1.0이 2026-10-13에 정식(stable) 선언됐다. npm 기준 1.0 계열은
`@tanstack/react-start` 1.169.x이고(1.169.0 → 2026-10-12, 1.169.1 → 2026-10-13),
2026-10-27 기준 `latest`는 1.169.4다. T045(PR #49)는 1.168.61까지만 올렸다.

1.0의 업그레이드 요구사항(2차 출처 기준): Vite 8 필요, 서버 함수 `.inputValidator()` 제거
(`.validator()`로 변경). 공식 블로그에는 RC → 1.0 API 변경 목록이 없다.

## 작업 내용

T045 브랜치 위에서 Start 계열을 1.0 최신으로 정확 핀한다(web·design-guide 동일).

| 패키지 | 이전 (T045) | 이후 |
| --- | --- | --- |
| @tanstack/react-start | 1.168.61 | 1.169.4 |
| @tanstack/react-router | 1.170.42 | 1.170.46 |
| @tanstack/router-plugin | 1.168.43 | 1.168.48 |

react-router-devtools(1.167.2), react-router-ssr-query(1.167.3), react-devtools(0.10.13),
devtools-vite(0.8.5)는 이미 최신이라 그대로 둔다.

호환성 점검:
- Vite: lockfile이 8.0.16으로 이미 1.0 peer(`vite >=8.0.0`)를 만족한다.
- `.inputValidator()`·`.validator()`·`createServerFn`: 앱 코드에서 쓰지 않는다. Start API는
  `createIsomorphicFn`(`apps/web/src/app/trpc.ts`, `apps/web/src/routes/__root.tsx`)만 쓴다.
- 결과적으로 소스 코드 수정은 필요 없다.

## 완료 기준

- [x] 두 워크스페이스의 Start 계열이 1.0 최신으로 정확 핀됨
- [x] GitHub Advisory에 대상 버전이 해당하지 않음
- [x] typecheck, lint, web·design-guide `vite build`, web·bff 테스트 통과

## 대화 기록

> **사용자**: 지금 1.0 정식 출시가 되었는데 그에 맞게 올려보자

## 작업 로그

- 2026-10-27: GitHub Advisory 패키지별 대조 — GHSA-g7cv-rxg3-hmpx(멀웨어) 대상 버전 아님,
  GHSA-qx66-fv34-fjm8(서버 함수 응답 reflected XSS, `react-start < 1.168.60`,
  `start-server-core < 1.169.39`)은 이후 버전(1.169.4 / 1.169.45)에서 패치됨.
- 2026-10-27: 버전 핀 갱신. 검증: `bun install --frozen-lockfile`, `bun run typecheck`,
  `bun run lint`, web·design-guide `vite build` 통과, web 테스트 49개·bff 테스트 100개 통과.
  query-core는 5.104.1 한 벌 유지, `routeTree.gen.ts` 변경 없음.
