# web 레이어 — 공용 도메인 데이터 경계

## 점진 채택

FSD 전체를 도입하지 않는다. 도메인 공용 코드의 자리는 `entities`이며, 화면은
`features`, 조립은 `routes`와 router 진입점이 담당한다.

T040에서 entities의 책임을 순수 모델·상수에서 공용 컬렉션·액션·동기화까지 확장한다.
같은 Task를 오늘·상세·프로젝트 feature가 함께 읽고 변경하므로, 한 feature가 다른
feature의 캐시를 수정하게 하는 것보다 이 경계에 소유권을 모으는 것이 적합하다.

## 의존 방향

- `routes` / router 조립 → `features` → `entities` → `shared`.
- `app`은 통신·인증 등 앱 인프라를 제공하며 entities를 import하지 않는다.
- entities는 app·features·routes를 import하지 않는다. 필요한 통신을 포트로 받는다.
- feature 간 직접 import, entity 간 직접 import는 계속 금지한다.
- Task와 Project는 현재 서버도 함께 다루는 task 도메인 안에서 관리한다. 가상의
  company 계층이나 범용 데이터 프레임워크를 추가하지 않는다.

`dependency-cruiser`의 의존 방향은 유지한다. 규칙의 entities 설명만 확장한 책임에 맞춘다.

## 파일별 책임

| 위치 | 책임 |
| --- | --- |
| `entities/task/status.ts` | 순수 표시 상수 |
| `entities/task/ports.ts` | 인증 구현을 모르는 통신 인터페이스 |
| `entities/task/data.ts` | 사용자별 DB·범위 로딩·커서 동기화·정리 |
| `entities/task/actions.ts` | 업무 의도, 낙관적 트랜잭션, 서버 응답 확정 |
| `entities/task/scope.ts` | 서버 범위와 DB 필터의 매핑 |
| `entities/task/queries.ts` | 공용 Task 조회식 |
| `entities/task/session.ts` | router / SSR 요청 단위의 사용자 환경 |
| `entities/task/context.tsx` | 데이터 환경 객체의 공급 |
| `features/*/state.tsx` | 페이지 UI Atom의 생성·공급 |
| `app/trpc.ts`, `app/task-events.ts` | 기존 인증을 통한 tRPC·SSE 전송 |
| `router.tsx`, `routes/_app` | 포트 주입·인증 경계·SSR 복원 |

페이지 Context에는 안정적인 Atom 객체를 넣는다. DB 데이터는 페이지 Atom에 복제하지
않으며, 컴포넌트 하나에서만 쓰는 상태나 기존 Form은 필요 없이 옮기지 않는다.
상세 페이지의 상태 Provider는 업무/프로젝트 ID를 key로 사용해 소유 대상 변경 시 초기화한다.

자세한 동작과 수명은 [web-cache-policy.md](web-cache-policy.md)를 따른다.
