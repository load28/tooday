# T044 — Provider 범위의 TanStack Store Atom으로 UI 상태 분리

- 상태: 완료
- 생성: 2026-09-23
- 완료: 2026-09-23

## 배경

T041·T042에서 서버 원본은 TanStack DB, 나머지 클라이언트 상태는 TanStack Store로
구분했지만 일부 화면 상태는 아직 React `useState`에 있고 큰 화면 컴포넌트가 상태와
시트 렌더링을 함께 소유한다. 페이지별 Store도 Atom을 제공하지만 소비가 화면 최상단에
집중되어 하위 UI를 독립적인 구독 경계로 나누기 어렵다.

## 작업 내용

- 화면 수명의 클라이언트 상태는 `@tanstack/react-store`의 실제 `Atom`으로 선언한다.
- route/feature 경계의 Provider가 `useCreateAtom`으로 Atom을 만들고 Context로 제공한다.
- 하위 컴포넌트는 필요한 Atom을 Context에서 직접 얻어 `useAtom`으로 개별 구독한다.
- Task·Project 등 서버 원본은 계속 TanStack DB live query로 읽고 Store에 복제하지 않는다.
- Form 상태와 재사용 UI 내부의 캡슐화된 로컬 상태는 각 소유자에 그대로 둔다.

## 완료 기준

- [x] 화면 수명의 시트·필터·선택 상태가 Provider 범위의 TanStack Store Atom으로 제공된다.
- [x] 큰 화면을 상태별 하위 구독 경계로 분리하고 불필요한 prop drilling을 만들지 않는다.
- [x] DB 서버 데이터가 Atom에 복제되지 않는다.
- [x] 관련 테스트, 전체 typecheck, lint:deps, check, build를 통과한다.

## 대화 기록

> **사용자**: 자...투데이 프로젝트를 지금 tanstack의 DB와 store로 리팩토링해보고싶어. 이전에 대화에서 내가 어떻게 db와 store를 구분해서 쓸지 그리고 각각도 어떻게 쓸지 논의했는데 그 내용을 기반으로 진행하고싶음
>
> **어시스턴트**: 좋아. 그 방향으로 리팩터링 진행 가능해. 다만 내가 지금 볼 수 있는 대화에는 이전 세션에서 논의했던 구체적인 내용이 포함되어 있지 않아서, 다른 대화방의 내용을 자동으로 불러올 수는 없어. [중략] 현재 README에 기록된 원칙을 공식 기준으로 삼아 Task 슬라이스부터 시작하면 돼.
>
> **사용자**: 맞아 그리고 스토어를 쓸 때에는 하위 컴포넌트들이 너무 커지지 않는게 중요하니 프로바이더를 이용해서 스토어의 아톰을 사용하는 방향으로 가야해
>
> **어시스턴트**: 맞아. 그 조건까지 포함하면 이번 리팩터링의 핵심은 단순히 “서버 데이터는 DB, UI 상태는 Store”에서 끝나는 게 아니라, Store를 사용하는 컴포넌트 구조까지 작고 명확하게 유지하는 것이야. [중략] 다음 단계는 현재 `apps/web`의 Store·Query·컬렉션 사용처를 전수 조사해서 각각을 DB / Store / Form / Router / local state로 분류한 뒤, Task 흐름부터 기준 구현으로 전환하는 거야.
>
> **사용자**: 아톰은 store에서 쓰는 아톰을 말하는거임 탠스택 스토어에서 제공하는 아톰
>
> **어시스턴트**: 아, 정확히 이해했어. 내가 앞에서 “atom이라는 표현을 작은 selector나 구독 단위까지 넓게 해석할 수 있다”고 설명한 부분은 잘못 짚었어. [중략] `createStoreContext`, `useCreateAtom`, `Atom<T>`, `useAtom` 조합을 일관되게 확대한다는 의미로 확정할게.
>
> **사용자**: 그럼 진행해보자

## 작업 로그

- 2026-09-23: 기존 DB·Store 경계와 화면별 `useState`/Atom 사용처를 조사한다.
- 프로젝트 생성 시트, 새 태스크의 상호 배타적인 시트, 로그아웃 확인 상태를 route별
  Provider가 생성하는 TanStack Store Atom으로 옮긴다.
- 프로젝트 상태 탭과 목록, 프로젝트 생성 버튼과 시트, 로그아웃 확인 시트를 하위
  구독 경계로 분리해 각 컴포넌트가 필요한 Atom을 직접 구독하게 한다.
- Provider 인스턴스 격리와 재마운트 초기화 테스트를 추가해 웹 48개 테스트를 통과한다.
- 전체 워크스페이스 typecheck·build, Biome check, dependency-cruiser, diff 검사를 통과한다.
- production build의 기존 500 kB 초과 chunk 경고는 남지만 빌드는 성공한다.
