# T047 — TanStack DB 1.0 RC로 올리고 서버 조회 실패를 DB health로 표면화

- 상태: 진행중 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-10-30
- 완료: -

## 배경

서버 데이터는 TanStack DB 컬렉션(직접 구현 sync + TanStack Query 연동 `queryCollectionOptions`)을
통해 가져온다. 화면에서 조회 실패를 처리하려면 그 실패가 DB를 통해 드러나야 하는데, 현재 버전
(`@tanstack/db@0.9.2`, `@tanstack/react-db@0.4.1`, `@tanstack/query-db-collection@1.2.15`)에서는
첫 로드 실패만 드러난다.

- 첫 로드 실패: `markError` → 컬렉션 `status: 'error'` → live query `error`
  (`query-db-collection/dist/esm/query.js:776,853`, `db/dist/esm/query/live/collection-config-builder.js:724-745`).
- 첫 로드 이후 실패: Query 어댑터는 `status === 'loading'`일 때만 `markError`를 부르고 나머지는
  반응형이 아닌 `utils.lastError`에만 남긴다(`query.js:840-856`). 직접 구현 sync의 델타 pull 실패는
  `scheduleRetry`가 재시도만 하고 어디에도 남지 않는다(`entities/task/server-cache.ts:139-148`).
- 첫 로드 이후 `ready → error`로 바꾸면 `insert`/`update`/`delete`가 `CollectionInErrorStateError`를
  던져 업무 명령이 막힌다(`db/dist/esm/collection/lifecycle.js:72-75`). 따라서 0.9에서는 status로
  표현할 수 없다.

`@tanstack/db@1.0.0-rc.1`(2026-10-29 배포, npm `latest` 태그)은 live query 결과에 `isLoadingError`,
`isSyncError`, `health`를 두고, sync 어댑터에 `reportError`/`reportHealthy`/`fail`을 제공한다
(`live-query-observer.d.ts:35-50`, `types.d.ts:385-410`). `query-db-collection@1.5.0`은 refetch
실패를 `reportError`로 보고한다. 근거: https://tanstack.com/db/latest/docs/guides/error-handling

## 작업 내용

1. `@tanstack/react-db` 0.4.1 → 1.0.0-rc.1, `@tanstack/query-db-collection` 1.2.15 → 1.5.0
   (`@tanstack/db`는 react-db 의존성으로 1.0.0-rc.1). 0.9 → 1.0 파괴적 변경에 맞춰 기존 동작을
   유지하도록 코드를 고친다.
2. 직접 구현 sync(`entities/task/server-cache.ts`)를 1.0 어댑터 규약에 맞춘다.
   - 첫 로드 실패: `markError` → `fail`.
   - 첫 로드 이후 델타 pull 실패: `reportError`, 성공 시 `reportHealthy`. 재시도(`scheduleRetry`)는 유지.
3. 화면은 별도 에러 저장소 없이 live query 결과의 `isSyncError`(첫 로드 이후 실패)와
   Suspense/`errorComponent`(첫 로드 실패)로 처리한다.

기각한 대안:
- 에러를 local-only 컬렉션 행이나 Atom에 직접 기록 — 사용자가 에러 전용 작업을 원하지 않음.
- 0.9에서 `ready → error` 전이 — 쓰기 명령이 막혀 업무 동작이 깨짐.

### 1단계에서 확인한 1.0 파괴적 변경과 대응

| 0.9 | 1.0 | 대응 |
| --- | --- | --- |
| `transaction.isPersisted.promise` | `transaction.when('settled')` | 그대로 치환 |
| sync `begin({ immediate })` | 제거. 낙관적 트랜잭션이 persisting 중이면 sync commit은 그 트랜잭션이 settle될 때 함께 보인다 (`types.d.ts` `commit` 설명) | `immediate` 인자 제거. `mutationFn` 안에서는 commit 영수증을 기다리지 않는다 — 기다리면 자기 자신의 settle을 기다려 교착한다 |
| sync `markError` | `fail` | 그대로 치환 |
| 렌더 중 sync 시작 | `useLiveSuspenseQuery`는 렌더 중 sync를 시작하지 않고 preload promise로 suspend | 앱은 route loader에서 preload하므로 영향 없음. 렌더 테스트를 loader와 같은 순서(preload → render)로 맞춤 |

### 2단계로 남은 것: view의 health 전파

화면이 읽는 view는 `db.collection(collectionOptions(id, () => liveQueryCollectionOptions(...)))`로
만든다(`server-cache.ts` `taskView`/`projectView`, `summaries.ts` `view`, `auth/server-cache.ts`
`sessionView`). 1.0에서 health tree는 `createLiveQueryCollection`이 등록한 builder로만 원본을 잇는다
(`db/dist/esm/collection/health-tree.js` `getCollectionBuilder`, `query/live-query-collection.js`
`bridgeToCreateCollection`). DbClient 경로는 등록하지 않아 view의 health가 `kind: 'source'`,
`sources: []`로 원본 문제를 전달하지 않는다(probe로 확인). 공식 Quick Start의 DbClient 사용법은
view 컬렉션이 아니라 hook에 query 함수를 넘기고(`q.from({ todo: 컬렉션 descriptor })`) `DbProvider`로
client를 주입한다. 이 형태로 바꾸는 것은 화면·loader·SSR 복원 구조를 함께 바꾸는 작업이라 2단계로 분리한다.

## 완료 기준

- [x] 두 패키지가 RC/최신으로 정확 핀됨 (`@tanstack/db`는 react-db 의존성으로 1.0.0-rc.1)
- [x] 원본 컬렉션이 첫 로드 이후 동기화 실패를 health(`failureReason`)로 보고하고 복구 시 지움
- [ ] 화면이 live query 결과의 health로 동기화 실패를 표시 (2단계)
- [x] 기존 동작(낙관적 변경, 범위 로드, 실시간 동기화, SSR 복원) 유지
- [x] typecheck, lint, lint:deps, web 테스트, web `vite build` 통과

## 대화 기록

> **사용자**: 여기서 스토어 관련되서 어떻게 구성되어 있나?
>
> **Claude**: [중략 — 클라이언트 Store(Atom) 구성 설명]
>
> **사용자**: 근데 지금 스토어에서는 데이터를 가져오는 기록이나 실패 같은것들이 없어서 화면 처리할 때에 부족한 점이 있는데 이런건 ...어떻게 접근할까? DB에 에러 상태나 과정을 기록하는 방법이 있을까?
>
> **Claude**: [중략 — 컬렉션 status·markError, useLiveSuspenseQuery 동작 설명]
>
> **사용자**: 그러면 지금 실패할때 버튼에 로딩을 표기하는 무언가가 있는데 그거를 위해서 이상한 함수를 만드는게 있어 그거 없애고 할수 있는걸 보여줘봐
>
> **Claude**: [중략 — useActionState/$synced 설명]
>
> **사용자**: 오...디비에 에러를 가져올때에는 그냥 리액트에서 제공하는 방법을 쓰면 모두 그걸로 쓸수있나?  싱크드 같은 필드 쓰지말고
>
> **Claude**: [중략 — useActionState/useTransition 설명]
>
> **사용자**: 4가지 케이스를 예시 코드로 보여줘 어떻게 쓸수 있는지
>
> **Claude**: [중략 — 예시 코드]
>
> **사용자**: 아니 ...디비에 탠스택 쿼리를 연동해서 디비를 통해서 서버데이터를 가져오는데 디비에서 가져올때 에러를 캐치해서 처리하고싶은거...
>
> **Claude**: [중략 — QueryCache onError 제안]
>
> **사용자**: 그래 지금은 탠스택 쿼리가 디비에 맵핑되어있고 디비를 통해서 서버데이터를 가져와서 가져올때 에러가 있어서 그걸 화면에서 처리해야하면 디비를 통해서 처리되어야해 이 관점에서 어떻게 할수있을지가 궁금해
>
> **Claude**: 결론: **첫 로드 실패는 컬렉션 `status`로, 이후 실패는 DB에 행으로 기록**하는 방식이 DB를 통하는 방법입니다. [중략 — local-only 컬렉션 제안]
>
> **사용자**: 이렇게 직접 에러를 위해서 무언가 작업을 하고싶진않아...방법이 없을까
>
> **Claude**: 결론: **지금 설치된 버전으로는 없고, 최신 TanStack DB 1.0.0-rc.1에는 있습니다.** 올리면 에러용 코드를 따로 만들지 않고 DB의 live query가 바로 에러 상태를 돌려줍니다. [중략 — isLoadingError/isSyncError/health, 어댑터 reportError/reportHealthy/fail 설명]
>
> **사용자**: rc로 한다고 쳤을때 우리 코드를 어떻게 개선할수 잇는지 고쳐봐

## 작업 로그

- 2026-10-30: 태스크 생성.
- 2026-10-30: 1단계 — `@tanstack/react-db` 1.0.0-rc.1, `@tanstack/query-db-collection` 1.5.0으로 올리고
  파괴적 변경에 대응. 직접 구현 sync가 델타 pull 실패를 `reportError`, 성공을 `reportHealthy`로 보고
  (첫 ready 이후에만 — 자체 ready 플래그로 추적). 테스트 추가: 델타 동기화 실패를 health로 알리고
  재시도 성공 시 지운다(보고 코드를 끄면 실패함을 확인). 검증: typecheck·lint·lint:deps 통과,
  web 테스트 50개 통과, web `vite build` 통과. `/verify` E2E(가입 → 프로젝트·태스크 생성 →
  today/projects/project 상세/task 상세 SSR 첫 HTML에 데이터 포함 → 토글 낙관적 즉시 반영 후
  새로고침에서 서버 값 유지 → 삭제 후 사라짐) 통과. 전체 새로고침을 반복하면 `auth.refresh`가 401로
  세션이 끊기는 현상과, 그때 `/login`에서 나는 에러는 업그레이드 전 코드로도 같은 지점에서 재현되어
  이번 변경과 무관함을 확인(T018 영역).
