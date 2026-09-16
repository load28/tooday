# T040 — 사용자별 Task DB·업무 액션·페이지 Store

- 상태: 완료
- 생성: 2026-09-16
- 완료: 2026-09-16

## 배경

오늘(`features/today/today-screen.tsx`), 상세(`features/tasks/task-detail-screen.tsx`),
프로젝트 보드가 동일한 업무를 서로 다른 Query 결과에 보관한다. 낙관적 패치는 한
화면의 캐시만 바꾸고 SSE도 오늘 화면의 주간 캐시만 갱신한다. 화면 상태의 수명과
서버 데이터의 수명을 분리하고, 업무 변경·동기화를 하나의 공용 데이터 경계로 모은다.

## 작업 내용

- T017의 스냅샷 일관성 수정이 선행한다(별도 T017 커밋).
- 사용자별 Task·Project 컬렉션과 이름 있는 액션을 도입한다. 화면별 원본 복제를 제거한다.
- 기존 tRPC 인증 경로·필드별 LWW·SSE 힌트/커서 프로토콜을 유지한다.
- 페이지 UI 상태만 페이지 Store가 소유한다. Form 상태는 기존 TanStack Form에 둔다.
- 전체 프로젝트 집계는 서버 Query에 남긴다. 부분 컬렉션으로 전체 집계를 추측하지 않는다.
- SSR 요청 격리·초기 데이터 전달·로그아웃 정리·진행 중 액션·캐시 수명을 검증한다.
- entities 경계와 캐시 컨벤션을 구현에 맞게 갱신한다.

## 완료 기준

- [x] 오늘·상세·프로젝트 화면이 같은 Task 변경을 구독한다.
- [x] 화면 코드가 Task Query 스냅샷을 직접 패치하지 않는다.
- [x] 실패·원격 변경·삭제·연속 수정 시 서버 상태로 수렴한다.
- [x] 페이지 Store는 화면 인스턴스별로 격리된다.
- [x] 미사용 데이터·연결 정리와 세션 종료 격리가 검증된다.
- [x] 실행 가능한 typecheck/test/check/lint:deps/build 결과와 환경 제약을 기록한다.

## 대화 기록

> **사용자**: 그럼 자 load28의 tooday라는 저징소를 이런 구조로 적용햐본다면 어떻게 접근하는지 설계햐라
>
**어시스턴트 (설계 원문)**

`load28/tooday`의 실제 코드를 기준으로 보면, **UI 상태는 화면이 소유하고, Task·Project는 여러 화면이 공유하며, 변경은 이름 있는 액션으로 수행하는 구조**가 적합합니다.

특히 이 저장소에서는 Store 도입보다 **화면마다 흩어진 동일한 Task 데이터를 통합하는 것**이 더 중요한 변화입니다. 현재 `main`의 [`ac9ce84`](https://github.com/load28/tooday/tree/ac9ce84460a9b907adc1b32ea5d5e79942dd0f2a)를 기준으로 설계했습니다. 코드는 수정하지 않았습니다.

**현재 구조에서 해결할 문제**

현재는 화면마다 다른 Query 결과에 Task가 들어 있습니다.

| 화면 | 현재 데이터 조회 | 변경 시 관리하는 대상 |
|---|---|---|
| 오늘 | `task.range` | 해당 주간 캐시 |
| 업무 상세 | `task.byId` | 해당 업무 캐시 |
| 프로젝트 상세 | `task.project` | 프로젝트와 업무 목록 |
| 프로젝트 목록 | `task.projects` | 프로젝트와 집계 수치 |

따라서 동일한 업무가 오늘 화면, 업무 상세, 프로젝트 상세에 각각 존재할 수 있습니다.

또한 현재 실시간 동기화는 오늘 화면의 `useTaskSync`에서 주간 캐시를 갱신합니다. 이것을 공통 데이터 계층으로 옮기면, 어떤 화면에서 변경하든 다른 화면도 같은 Task를 읽게 만들 수 있습니다. [오늘 화면](https://github.com/load28/tooday/blob/ac9ce84460a9b907adc1b32ea5d5e79942dd0f2a/apps/web/src/features/today/today-screen.tsx), [동기화 훅](https://github.com/load28/tooday/blob/ac9ce84460a9b907adc1b32ea5d5e79942dd0f2a/apps/web/src/features/today/use-task-sync.ts)

**상태의 소유권은 이렇게 나누겠습니다**

| 상태 | 관리 수단 | 소유 범위 |
|---|---|---|
| 업무 원본 | TanStack DB `tasks` | 로그인 사용자 |
| 프로젝트 원본 | TanStack DB `projects` | 로그인 사용자 |
| 프로젝트별 전체·완료 건수 | TanStack Query | 로그인 사용자 |
| 오늘 화면의 선택 날짜 | 페이지 Store | 오늘 화면 |
| 프로젝트 화면의 선택 탭 | 페이지 Store | 해당 프로젝트 화면 |
| 상세 화면의 열린 시트 | 페이지 Store 또는 지역 상태 | 해당 업무 상세 |
| 작성 중인 제목·날짜·시간 | 기존 TanStack Form 또는 지역 상태 | 편집 화면 |
| 로그인 사용자 조회 | 기존 TanStack Query | 인증 세션 |

현재 서버가 사용자 단위로 데이터를 분리하므로, **이 저장소에서는 회사 스코프를 새로 도입할 필요가 없습니다.**

로그인 사용자별 데이터 환경을 만들고, 페이지는 그 환경에서 필요한 데이터를 구독하면 됩니다.

여기서 “사용자 소유”는 “로그인 내내 모든 데이터를 메모리에 유지한다”는 뜻이 아닙니다. **데이터를 공유하는 경계는 사용자이고, 실제 데이터의 유지 기간은 구독과 캐시 정책으로 결정합니다.**

**페이지 Store에는 화면 상태만 둡니다**

예를 들어 오늘 화면은 다음처럼 나눕니다. 아래 코드는 역할을 보여주는 설계용 인터페이스이며, 라이브러리 API를 그대로 구현한 코드는 아닙니다.

```tsx
function TodayPage() {
  const pageState = useTodayPageState()
  const taskData = useTaskData()

  return (
    <TodayProvider value={pageState}>
      <TodayScreen taskData={taskData} />
    </TodayProvider>
  )
}
```

각 역할은 다음과 같습니다.

```ts
// 페이지가 생성하고 소유하는 UI 상태
type TodayPageState = {
  selectedDateAtom: DateAtom
}

// 인증된 사용자 범위에서 공유하는 데이터 의존성
type TaskData = {
  tasks: TaskCollection
  projects: ProjectCollection
  actions: TaskActions
}
```

오늘 화면의 목록은 `selectedDateAtom`과 `tasks`를 이용해 조회합니다. 날짜가 변경되면 조회 조건이 바뀌고, 서버에서 Task가 변경되면 조회 결과가 바뀝니다.

**조회 결과를 다시 `tasksAtom`에 복사하지 않습니다.**

다만 현재 한 컴포넌트에서만 사용하는 boolean까지 모두 Atom으로 바꿀 필요는 없습니다. 여러 하위 컴포넌트가 함께 읽거나 조작하는 상태부터 페이지 Store로 옮기겠습니다. 이미 사용하는 TanStack Form도 유지합니다.

**컬렉션은 화면별로 만들지 않습니다**

오늘 화면용 Task 컬렉션, 상세 화면용 Task 컬렉션을 각각 만들면 기존 Query 캐시의 중복 문제가 반복됩니다.

논리적으로는 사용자별로 다음 두 컬렉션을 공유합니다.

```ts
tasks     // 업무 ID 기준
projects  // 프로젝트 ID 기준
```

화면별로 달라지는 것은 컬렉션이 아니라 **조회 조건과 필요한 데이터 범위**입니다.

| 화면 | 필요한 범위 |
|---|---|
| 오늘 | 선택한 주간의 업무 |
| 프로젝트 상세 | 해당 프로젝트의 업무 |
| 업무 상세 | 해당 ID의 업무 |

이를 위해 기존 `range`, `project`, `byId` API를 공통 로딩 어댑터 뒤에 둡니다. 화면에서 필요한 범위를 요청하면, 어댑터가 적절한 API를 호출하고 결과를 같은 컬렉션에 반영합니다.

TanStack DB에는 요청 범위에 맞춰 로딩하는 기능이 있지만, **기존 tRPC API와의 조건 매핑은 우리가 구현해야 합니다.** 임의의 API가 자동으로 연결되는 것은 아닙니다. [공식 동기화 개요](https://tanstack.com/db/latest/docs/overview)

또한 업무의 날짜가 바뀌어 이번 주에서 빠졌다고 해서 컬렉션에서 삭제하면 안 됩니다. 프로젝트 화면에서는 여전히 필요한 업무일 수 있기 때문입니다. **조회 범위에서 빠지는 것과 서버에서 삭제되는 것을 구분**해야 합니다.

**액션은 화면이 아니라 업무의 의도를 표현합니다**

공용 액션 인터페이스는 다음 정도로 시작하겠습니다.

```ts
type TaskActions = {
  renameTask(input: {
    taskId: string
    title: string
  }): Promise<void>

  setTaskStatus(input: {
    taskId: string
    status: TaskStatus
  }): Promise<void>

  moveTaskToProject(input: {
    taskId: string
    projectId: string | null
  }): Promise<void>

  rescheduleTask(input: {
    taskId: string
    date: string
    startAt: string
    durationMin: number
  }): Promise<void>

  deleteTask(input: {
    taskId: string
  }): Promise<void>
}
```

오늘 화면과 상세 화면은 같은 액션을 호출합니다.

```ts
await actions.setTaskStatus({
  taskId: task.id,
  status: 'done',
})
```

이 액션 내부의 책임은 다음과 같습니다.

1. DB 트랜잭션에서 해당 Task를 낙관적으로 변경합니다.
2. 기존 tRPC의 `task.update`에 필요한 필드만 보냅니다.
3. 서버 응답을 동기화 계층에 반영합니다.
4. 성공한 서버 상태로 낙관적 변경을 확정합니다.
5. 실패하면 해당 낙관적 변경을 롤백합니다.

요청 본문은 컬렉션 전체를 그대로 직렬화하지 않고 명시적으로 만듭니다.

```ts
// 현재 API 계약에 맞게 구성
{
  id: input.taskId,
  patch: {
    status: input.status,
  },
}
```

그 결과 오늘 화면의 체크 상태, 상세 화면의 상태, 프로젝트 화면의 탭별 업무 목록이 같은 Task 변경을 따라갑니다.

현재 서버의 필드별 LWW 정책도 유지합니다. DB 트랜잭션을 도입한다는 이유로 `version`을 낙관적 잠금 조건으로 바꾸지는 않습니다. [현재 API 구현](https://github.com/load28/tooday/blob/ac9ce84460a9b907adc1b32ea5d5e79942dd0f2a/apps/bff/src/modules/task/router.ts)

그리고 **액션이라고 반드시 여러 컬렉션을 수정할 필요는 없습니다.** `moveTaskToProject`는 Task의 `projectId`만 변경하면 됩니다. 새로운 업무 규칙이 생겼을 때 여러 변경을 하나의 액션으로 묶으면 됩니다.

**프로젝트 집계는 당장 DB에서 계산하지 않겠습니다**

여기는 구분이 필요합니다.

이번 주 업무만 로딩했다면, 컬렉션에서 계산한 완료 건수는 프로젝트 전체의 완료 건수가 아닙니다.

따라서 초기 설계에서는 다음처럼 나눕니다.

- 프로젝트 이름·색상: `projects` 컬렉션.
- 프로젝트 전체·완료 건수: 서버 집계 Query.
- 업무 생성·삭제·상태 변경·프로젝트 이동: 관련 집계 Query 무효화.
- 다른 기기의 변경 수신: 관련 집계 Query도 무효화.

집계 숫자까지 즉시 낙관적으로 바꾸는 것은 별도 요구가 있을 때 추가하겠습니다. 부분적으로 로딩한 데이터로 전체 집계를 계산하는 오류를 먼저 피해야 합니다.

**기존 실시간 동기화는 공용 어댑터로 이동합니다**

`tooday`에는 이미 SSE 알림, 변경 커서, 삭제 표식이 있습니다. 이를 살리겠습니다.

현재 오늘 화면의 훅이 담당하는 다음 작업을 공통 동기화 어댑터로 옮깁니다.

- SSE 연결.
- 변경 커서 이후 데이터 요청.
- Task·Project 변경 반영.
- 삭제 표식 처리.
- 재연결 후 누락된 변경 조회.
- 연결·요청 취소와 정리.

화면은 동기화 방법을 모르고 컬렉션만 구독합니다.

사용자 범위에서 SSE 연결은 공유하되, Provider를 마운트했다는 이유만으로 영구 연결하지 않습니다. 활성 컬렉션의 동기화 수명에 연결하고, 마지막 동기화 사용이 종료되면 정리합니다. TanStack DB의 사용자 정의 어댑터도 이러한 정리 함수를 반환하도록 설계되어 있습니다. [공식 어댑터 가이드](https://tanstack.com/db/latest/docs/guides/collection-options-creator)

한 가지 선행 작업이 있습니다. 저장소의 **T017에는 초기 데이터와 변경 커서를 서로 다른 스냅샷에서 읽어 변경을 놓칠 수 있는 문제가 이미 기록되어 있습니다.**

이것은 DB를 도입해도 해결되지 않습니다. 먼저 서버가 데이터와 커서를 일관된 스냅샷으로 반환하도록 수정해야 합니다. [T017 작업 문서](https://github.com/load28/tooday/blob/ac9ce84460a9b907adc1b32ea5d5e79942dd0f2a/docs/tasks/T017-sync-read-snapshot-consistency.md)

추가로 변경 요청의 응답을 받았다고 전역 변경 커서를 그 위치까지 건너뛰어서는 안 됩니다. 그 사이 다른 업무의 변경을 아직 받지 못했을 수 있습니다.

**자동 정리는 세 가지 수명으로 구분합니다**

| 대상 | 정리 기준 |
|---|---|
| 페이지 Store | 해당 페이지 또는 컴포넌트 트리의 종료 |
| DB 컬렉션 데이터·동기화 | 구독이 사라진 뒤 설정된 `gcTime` |
| Query 캐시 | 비활성 상태 이후 설정된 `gcTime` |
| 인증 사용자 데이터 전체 | 로그아웃·사용자 변경 시 명시적 정리 |

DB의 자동 정리는 컬렉션 데이터와 동기화 리소스의 정리입니다. 모듈이나 `Map`에 보관한 컬렉션 객체 참조까지 자동으로 삭제해 주는 것은 아닙니다. [컬렉션 정리 문서](https://tanstack.com/db/latest/docs/reference/interfaces/Collection)

또한 Task 컬렉션을 계속 구독하는 화면이 있다면, **예전에 조회한 각 주간 데이터가 컬렉션 GC만으로 개별 정리되지는 않습니다.** 범위별 데이터 해제 정책은 로딩 어댑터에서 따로 다뤄야 합니다.

화면을 나가도 진행 중인 저장은 완료될 수 있어야 합니다. 따라서 액션의 수명은 페이지 Store와 분리하고, 로그아웃 시에는 이전 사용자의 늦은 응답이 새 세션에 반영되지 않도록 요청 취소와 세션 식별 검사를 함께 적용합니다.

**코드 배치는 기존 규칙을 명시적으로 확장하겠습니다**

현재 `entities`는 순수 모델·상수만 허용합니다. 공용 컬렉션과 액션을 넣으려면 해당 규칙을 함께 개정해야 합니다. [현재 레이어 규칙](https://github.com/load28/tooday/blob/ac9ce84460a9b907adc1b32ea5d5e79942dd0f2a/docs/conventions/web-entities.md)

저라면 새 최상위 레이어를 추가하기보다, 현재 서버에서도 Task와 Project를 함께 취급하는 `entities/task`를 공용 데이터 경계로 확장하겠습니다.

| 위치 | 책임 |
|---|---|
| `entities/task/collections.ts` | Task·Project 컬렉션 구성 |
| `entities/task/actions.ts` | 업무 액션 |
| `entities/task/sync.ts` | 초기 로딩·변경 동기화 |
| `entities/task/ports.ts` | 필요한 통신 인터페이스 |
| `features/today/state.ts` | 오늘 화면 UI 상태 |
| `features/task-detail/state.ts` | 상세 화면 UI 상태 |
| `routes/_app` | 인증 사용자와 데이터 환경 조립 |
| `app/trpc.ts` | 기존 인증·토큰 갱신을 포함한 통신 |

`entities/task`가 `app/trpc.ts`를 직접 import하지 않고, 라우트 조립 단계에서 통신 함수를 주입합니다. 기존 feature 간 직접 import 금지도 유지할 수 있습니다.

SSR에서는 서버 모듈 전역에 사용자 컬렉션을 만들지 않습니다. 요청별로 격리하고, 기존 Query의 SSR 처리가 DB까지 자동으로 수화한다고 가정하지 않겠습니다.

**적용은 다음 순서로 진행하겠습니다**

1. **동기화 정확성 확보**  
   T017의 스냅샷·커서 문제부터 해결합니다.

2. **기존 Query 위에서 액션 추출**  
   화면의 mutation을 공용 업무 액션으로 옮겨 UI와 저장 로직을 먼저 분리합니다.

3. **페이지 상태 소유권 정리**  
   공유가 필요한 화면 상태에만 Store를 적용하고 기존 Form은 유지합니다.

4. **공용 DB와 동기화 어댑터 도입**  
   오늘·업무 상세·프로젝트 상세의 Task 읽기를 함께 전환합니다. 같은 Task를 DB와 기존 화면 캐시에 따로 쓰는 상태를 최종 구조로 남기지 않습니다.

5. **수명과 동시성 검증**  
   탭 이동 중 저장, 다른 기기의 변경, 실패한 낙관적 수정, 날짜 이동, 로그아웃 후 늦은 응답을 확인합니다.

이 설계가 제대로 적용되었는지 판단할 대표 시나리오는 명확합니다. **오늘 화면에서 업무를 완료하고 상세·프로젝트 화면으로 이동해도 같은 상태가 보이며, 페이지의 선택 상태는 페이지와 함께 정리되고, 서버 데이터는 사용 여부에 따라 유지·정리되어야 합니다.**

> **사용자**: 그럼 작업을 해서 피알을 올려봐
>
> **어시스턴트**: 설계한 구조를 실제 코드에 적용하고, 필요한 검증을 거쳐 PR을 올리겠습니다. 먼저 저장소의 최신 상태와 작업 규칙을 확인하겠습니다.

## 작업 로그

- 2026-09-16: main 기준 코드·태스크·의존 방향·캐시 정책을 확인했다. 구현을 시작한다.


## 구현 결정과 검증

- 공용 `task.snapshot` 범위 계약을 추가했다. 기존 API를 화면별로 재사용하는 설계에서,
  모든 범위의 초기 데이터와 커서를 동일한 스냅샷으로 반환하도록 구체화했다.
- `@tanstack/react-db` 0.4.1 (DB 0.9.2), `@tanstack/react-store` 0.11.1을 고정하고 lockfile을 갱신했다.
- 원본 Task/Project와 파생 live query 모두 사용자별 DbClient가 소유한다. SSR 종료 시
  파생 조회부터 정리한다. 범위 load/unload, 마지막 원본 구독 GC, 액션 임시 구독을 분리했다.
- 범위별 TTL과 컬렉션 GC는 데이터·연결을 정리한다. DbClient가 보유하는 컬렉션 객체 참조는
  사용자 세션이 끝날 때 제거한다. 페이지 unmount와 모든 데이터의 즉시 소멸은 같은 의미가 아니다.
- 생성·삭제는 서버 확인 후 적용한다. 부분 수정만 낙관적으로 적용하며 실패한 트랜잭션만 롤백한다.
- 일정 변경에서 선택적 date를 생략하면 시간 필드만 보낸다. 아직 수신하지 못한 원격 날짜를 덮어쓰지 않는다.
- 실제 SSR 검사에서 이미 로딩한 범위를 Promise로 반환하면 재차 suspend되는 문제를 발견했다.
  loadSubset은 캐시 준비가 끝났을 때 동기 완료를 반환한다. 서버 렌더·hydration 회귀 테스트를 추가했다.
- 오늘·프로젝트·상세의 페이지 Atom Provider를 도입하고 Form·지역 입력 draft는 유지했다.
- 낙관적 Query 스냅샷 복원 헬퍼와 오늘 화면 전용 SSE 훅을 제거했다.

### 검증 결과

- 전체 workspace typecheck 통과.
- dependency-cruiser 의존 방향 검사 통과.
- 변경된 TS/TSX/JSON/CJS 파일 Biome 검사 통과. `git diff --check` 통과.
- 웹 테스트 34 pass / 0 fail (공용 데이터·SSR/hydration·페이지 격리 포함).
- BFF 테스트 100 pass / 6 Redis skip / 0 fail.
- 웹 프로덕션 빌드 통과.
- 실제 BFF(PGlite)와 빌드된 웹 서버: 인증 후 오늘·업무 상세·프로젝트 상세·프로젝트 목록
  4개 요청이 HTTP 200이며 서버 HTML에 데이터가 포함됨을 확인했다. 요청 종료 시 live query 정리 오류가 없다.

### 환경 제약과 미검증 범위

- Bun/PGlite 테스트 프로세스는 성공 요약 후 exit 99를 반환한다. 원본 main 별도 worktree에서도
  Task 어댑터 테스트 18 pass / 0 fail 뒤 동일한 exit 99를 재현했다. 테스트 실패와 구분해 기록한다.
- Vitest는 테스트 통과 후 Vite 종료 지연 경고를 남긴다. 원본 main의 time 테스트 12 pass 뒤에도
  동일한 경고가 재현된다. 테스트 모드에서 Start/Nitro/devtools 기동을 제외해 불필요한 서버 부팅 오류는 제거했다.
- Chromium 다운로드가 timeout/502로 실패해 실제 브라우저 E2E는 실행하지 못했다.
  React DOM/jsdom hydration 검증과 실제 HTTP SSR 검증은 별도로 통과했다.
- Redis 서버 및 실제 PostgreSQL 풀 동시성 테스트는 실행하지 않았다. PostgreSQL 읽기 격리는
  SQL 어댑터의 명시적인 REPEATABLE READ 트랜잭션과 계약 테스트로 검증했다.

### 추가 대화 기록

> **어시스턴트**: 실제 서버를 연결한 검사에서 첫 SSR 요청이 대기하는 문제가 드러났습니다. 이미 로딩한 범위도 비동기 로딩으로 반환하던 부분을 수정했습니다. 수정본을 다시 빌드해 실제 요청이 정상적으로 끝나는지 확인하겠습니다.
>
> **어시스턴트**: 수정 후 오늘·상세·프로젝트 화면 4개에서 실제 인증 요청과 SSR 응답을 확인했습니다. 요청 종료 시 파생 조회도 먼저 정리하도록 수명 처리를 보강하고 있습니다. 브라우저 자동화는 Chromium 다운로드가 막혀 실행하지 못했으며, 이 검증 범위는 PR에 명시하겠습니다.
>
> **어시스턴트**: 종료 경고는 원래 코드에서도 재현됐습니다. 마지막 검토에서는 시간만 수정할 때 다른 기기의 날짜 변경을 덮어쓰지 않도록 요청 필드도 바로잡았습니다. 최종 검증이 끝나면 두 작업 커밋(T017·T040)을 브랜치에 올리고 PR을 생성하겠습니다.
