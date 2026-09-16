# web 상태·캐시 정책

## 소유권

| 데이터 | 소유자 | UI 접근 |
| --- | --- | --- |
| Task·Project 원본 | 사용자별 `entities/task/data.ts` | DB live query |
| 프로젝트 전체·완료 건수 | 서버 집계 + Query | `task.projects` |
| 인증 사용자 | Query | `user.me` |
| 선택 날짜·탭·열린 시트 | 페이지 Store | Context로 Atom 객체 전달 후 개별 구독 |
| 입력 중인 값 | TanStack Form 또는 지역 draft | 폼의 검증·dirty 상태 유지 |

DB 조회 결과를 Atom이나 화면별 Query에 다시 복사하지 않는다. 컬렉션 ID에는 사용자
ID를 포함하고 브라우저 router / SSR 요청마다 별도의 데이터 환경을 만든다. 회사나
페이지별 컬렉션 레지스트리는 만들지 않는다.

## 업무 변경

`entities/task/actions.ts`의 이름 있는 액션을 호출한다. 화면은 API body나 캐시 패치를
조립하지 않는다. 액션은 변경 필드만 기존 tRPC 의도 기반 API로 보낸다.

- 제목·상태·프로젝트·일정 수정: DB 트랜잭션의 낙관적 변경 → 서버 요청 →
  서버 응답을 원본 sync에 적용 → 완료. 실패 시 그 트랜잭션의 변경만 제거한다.
- 같은 Task의 요청은 사용자 의도 순서대로 전송한다. 다른 Task는 병렬이다.
- 서버 `version`은 클라이언트에서 증가시키지 않는다. 늦은 서버 응답·스냅샷은
  마지막 수신 버전보다 새로울 때만 반영한다. 삭제 표식도 버전을 가진다.
- Task·Project 생성은 서버 ID를 받은 뒤 반영한다. 삭제는 서버 확인 후 제거한다.
  모든 액션이 낙관적일 필요는 없다.
- 서버 응답은 전역 동기화 커서를 전진시키지 않는다. 다른 행의 미수신 변경을
  건너뛰지 않도록 커서는 `task.changes` 전체 적용 후에만 전진시킨다.
- 프로젝트 집계는 액션과 원격 변경에서 invalidate한다. 부분 로딩한 Task로 전체
  완료 건수를 추정하지 않는다.

기존 `optimisticPatch`의 전체 Query 스냅샷 복원과 `applyTaskPatch`는 제거했다.
낙관적 상태와 원격 변경을 합치는 책임은 DB 트랜잭션과 공용 sync가 가진다.

## 조회·SSR

`task.snapshot`은 날짜 범위, 프로젝트, 단건, 프로젝트 라벨을 지원한다. SQL 어댑터는
데이터와 커서를 동일한 REPEATABLE READ 트랜잭션에서 읽는다.

라우트 loader는 `TaskData.preload(scope)`로 필요한 범위만 로딩한다. 이 함수도 컴포넌트와 동일한 파생 live query의
`loadSubset` 경로를 사용한다. 파생 조회 역시 DbClient에 등록하고, 구독이 없으면
라이브러리 GC가 정리한다. 요청 종료에는 파생 조회부터 정리한다. 캐시된 범위는 `loadSubset`이 동기적으로 완료해 SSR에서 다시 suspend하지 않는다.
지원하지 않는 필터는 명시적으로 실패하며 전체 데이터를 대신 다운로드하지 않는다.

- SSR router의 `dehydrate`에 원본 행·로드한 범위·동기화 커서를 싣는다.
- 브라우저 `hydrate`에서 스키마 검증 후 사용자 환경을 복원한다.
- 함수·Atom·연결은 직렬화하지 않는다. 서버에서는 SSE를 열지 않는다.
- `serverSsr.onCleanup`에서 요청의 컬렉션·타이머를 정리한다.
- 기준 날짜는 기존처럼 loader의 `now`를 사용한다.

## 자동 정리와 세션 종료

- 원본 컬렉션 `gcTime`: 5분. 마지막 원본 구독 해제 후 DB가 sync cleanup을 호출한다.
  live query 자체의 수명도 있으므로 페이지 unmount와 원본 GC를 같은 사건으로 보지 않는다.
- 범위별 캐시: 마지막 획득 해제 후 5분. 다른 범위를 계속 구독하고 있더라도 만료한
  범위 전용 행은 제거한다. 범위 해제는 서버 삭제 표식과 다르다.
- 액션은 임시 구독으로 컬렉션을 유지한다. 페이지를 떠나도 저장이 완료되고,
  성공·실패 모두에서 그 구독을 해제한다.
- SSE는 활성 sync 원본들이 공유하고, 마지막 원본 cleanup에서 닫는다. 데이터 환경을
  Context로 공급하는 것만으로 연결을 유지하지 않는다.
- 로그아웃·세션 상실·사용자 변경은 AbortController로 이전 요청·대기 액션을 차단하고,
  DB와 Query를 명시적으로 비운다. GC는 보안 경계를 대체하지 않는다.

## 남아 있는 Query의 정책

인증·집계에는 Query의 기본 staleTime 0 / gcTime 5분을 사용한다. 인증 게이트의
예외는 `fetchSessionUser`가 소유한다. loader에서 캐시를 즉시 반환하면서 재검증하려면
`ensureQueryData({ ..., revalidateIfStale: true })`를 사용한다.

화면 이동을 이유로 Task 캐시를 지우지 않는다. 인증 응답의 `setQueryData` prime은
유지하고, 집계는 invalidate한다. Query 키는 `trpc.<procedure>.queryKey()`로 파생한다.

## 에러

폼은 기존 `formError`를 사용한다. 오늘 토글과 상세 수정·삭제는 mutation error를
표시한다. 상세 제목은 draft가 없을 때 원격 제목을 그대로 보여 주고, 작성 중이면
draft를 유지한다. 저장 실패 시 입력을 잃지 않는다.
