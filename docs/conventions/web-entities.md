# web 레이어 — FSD 부분 채택 (entities)

## 원칙: 전면 도입이 아니라 단위별 점진 채택

FSD(Feature-Sliced Design)를 통째로 도입하지 않는다. **필요가 증명된 레이어만
하나씩 들여온다.** 현재 채택한 단위는 `entities` 하나다. 나머지(widgets, pages
분리, 슬라이스별 public API 배럴 등)는 같은 종류의 필요가 실제로 쌓일 때
그 단위만 추가한다 — 도입 시 dependency-cruiser 규칙과 이 문서를 함께 갱신한다.

## 왜 entities인가

기존 구조는 "도메인 무관 `shared/`" 아니면 "feature 슬라이스" 둘뿐이라,
**도메인 지식이 있으면서 여러 feature가 쓰는 코드**의 자리가 없었다.
그 결과 `PROJECT_COLOR`, `STATUS_ORDER` 같은 도메인 상수가 shared에 들어가며
"shared = 도메인 무관" 명분을 침식했다. 이 회색지대가 FSD entities가 푸는
문제라서, 이 레이어 하나만 가져왔다.

## 레이어와 의존 방향

```
routes → features → entities → shared
                       (app은 shared와 같은 최하층)

apps/web/src/entities/<domain>/   # 도메인 공용 모델·표시 상수
  task/status.ts                  #   STATUS_ORDER, STATUS_*_TONE
  task/patch.ts                   #   applyTaskPatch
```

> `project/color.ts`(PROJECT_COLOR)는 entities의 첫 사례였지만, 진행률 바가 shared/ui
> `ProgressBar`로 승격되며 색 매핑이 recipe tone(Dot과 동일한 팔레트 이름)으로 흡수돼
> 제거됐다 (T009). 도메인 색 이름 → 토큰 매핑이 다시 여러 feature에 필요해지면
> 같은 자리(entities/project/)에 되살린다.

dependency-cruiser가 CI에서 강제한다 (`bun run lint:deps`):

- `web-entities-direction` — entities는 **shared만** import 할 수 있다.
- `web-no-cross-entity` — entities 슬라이스끼리 직접 import 금지.
- `web-layer-direction` — shared/app은 entities를 포함한 상위 레이어를 import 금지.

## 무엇을 어디에 두나

| 코드 성격 | 위치 |
| --- | --- |
| 도메인 무관 (i18n, time, form, ui) | `shared/` |
| 한 feature 전용 | 그 `features/<feature>/` 안 |
| 도메인 지식 + 두 개 이상 feature가 공용 | `entities/<domain>/` |
| feature 간 UI 조립 (화면 결합) | `routes/` — 배선 층이 주입한다 |

entities에는 **순수 모델·상수·매핑만** 둔다 — 계약(`@tooday/shared`) 타입에서
파생되는 표시 순서, tone/토큰 매핑 같은 것. 쿼리·뮤테이션·화면 컴포넌트는
feature에 남는다 (이 경계도 확대 필요가 생기면 이 문서에서 재검토한다).

## 예

```ts
// ❌ 도메인 상수를 shared에 — "shared = 도메인 무관"이 침식된다
// apps/web/src/shared/task-status.ts

// ❌ 한 feature에 두고 다른 feature가 경계를 넘어 import
// features/projects/… ← features/tasks/status.ts

// ✅ entities 슬라이스 — tasks·projects 어느 feature든 import 가능
// apps/web/src/entities/task/status.ts
import { STATUS_ORDER } from '@/entities/task/status';
```
