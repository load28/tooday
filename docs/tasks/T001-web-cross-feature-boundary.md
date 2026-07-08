# T001 — feature 간 직접 import 제거 + web-no-cross-feature 규칙

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-08
- 커밋: ccd8b74

## 배경

전수 조사에서 웹 feature 수직 슬라이스 경계 위반 2건 발견:

- `apps/web/src/features/tasks/new-task-screen.tsx:6` — `features/projects/new-project-sheet` 직접 import (tasks → projects)
- `apps/web/src/features/projects/project-detail-screen.tsx:8` — `features/tasks/status`의 `STATUS_ORDER` import (projects → tasks)

결정적으로 `.dependency-cruiser.cjs`에 BFF에는 `bff-no-cross-module` 규칙이 있는데
웹에는 대응 규칙이 없어 CI(`bun run lint:deps`)가 못 잡는 가드레일 공백이었다.

## 작업 내용

1. `features/tasks/status.ts` → `shared/task-status.ts` 승격 (이후 T002에서
   `entities/task/status.ts`로 재이동).
2. `NewTaskScreen`의 `NewProjectSheet` 직접 import를 `renderNewProjectSheet`
   슬롯 prop으로 전환 — tasks ↔ projects 조립은 `/tasks/new` 라우트(배선 층)가 담당.
   슬롯 계약 타입은 `NewProjectSheet` 기존 props(`open`/`onClose`/`onCreated`)와 동일.
3. dependency-cruiser에 `web-no-cross-feature` 규칙 추가 (BFF `bff-no-cross-module`과 대칭).
4. README 디렉토리 전략에 "feature 간 직접 import 금지" 명시.

## 완료 기준

- [x] cross-feature import 0건
- [x] `web-no-cross-feature` 규칙이 고의 위반 파일에서 실제 error를 냄 (검증 후 삭제)
- [x] lint:deps / typecheck / Biome / 테스트(web 5·bff 94) 통과

## 대화 기록

> **사용자**: 전체 디저인시스템의 아키텍처나 bff 설계 등등을 보고 체계적으로 잡힌게
> 아니라 예외적으로 만들어쟈있는부분을 찾아 개선하고싶음 먼저 찾아봐
>
> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (4방향 병렬 조사 후 종합 보고 중, 이 태스크 해당 부분 원문):
>
> ## 🔴 우선순위 높음 — 아키텍처 경계·계약 문제
>
> **1. feature 간 직접 import 2건 + 이를 막는 규칙 자체가 없음**
> - `features/tasks/new-task-screen.tsx:6` → `features/projects/new-project-sheet` import
> - `features/projects/project-detail-screen.tsx:8` → `features/tasks/status`의 `STATUS_ORDER` import
> - 결정적으로, `.dependency-cruiser.cjs`에 BFF에는 `bff-no-cross-module` 규칙이 있는데
>   **웹에는 대응하는 `web-no-cross-feature` 규칙이 없습니다.** 같은 수직 슬라이스
>   전략인데 웹만 가드레일이 빠져 있고, 이미 2건이 그 구멍을 통과했습니다. 개선:
>   공용 코드(`STATUS_ORDER`, tone 맵, `NewProjectSheet` 접근 경로)를 `shared/`로
>   올리고 규칙 추가.
>
> [중략]
>
> ## 추천 착수 순서
>
> 1. **가드레일부터**: `web-no-cross-feature` 규칙 추가 + 위반 2건 해소(`status.ts` →
>    shared 승격) — 이걸 먼저 해야 이후 정리가 안 무너집니다.
>
> **사용자**: 1번 먼저수정하자
>
> **Claude** (완료 보고 원문):
>
> 1번 수정 완료, `claude/design-system-architecture-wgljlr` 브랜치에 커밋·푸시했습니다.
>
> ## 변경 내용
>
> **1. `STATUS_ORDER`·tone 매핑을 shared로 승격** — `features/tasks/status.ts`를
> `shared/task-status.ts`로 이동했습니다. `shared/project-color.ts`와 같은 성격(계약
> enum → UI tone 매핑)이라 자리가 자연스럽고, tasks·projects 두 feature가 경계 위반
> 없이 공용할 수 있습니다. 사용처 2곳(`task-detail-screen`, `project-detail-screen`)의
> import를 갱신했습니다.
>
> **2. `NewProjectSheet` 직접 import → 라우트 주입** — `NewProjectSheet`은 프로젝트
> 도메인 코드라 shared로 올릴 수 없어서, `NewTaskScreen`에 `renderNewProjectSheet`
> 슬롯 prop을 추가하고 `/tasks/new` 라우트가 두 feature를 조립하게 했습니다. README가
> 정의한 "routes = 배선(화면 연결)" 역할에 정확히 부합하는 방식입니다. 슬롯 계약
> 타입은 `NewProjectSheet`의 기존 props(`open`/`onClose`/`onCreated`)와 동일해서 동작
> 변화는 없습니다.
>
> **3. `web-no-cross-feature` 규칙 추가** — `.dependency-cruiser.cjs`에 BFF의
> `bff-no-cross-module`과 대칭인 규칙을 추가했습니다. 일부러 위반 파일을 만들어
> 규칙이 실제로 error를 내는 것까지 확인한 뒤 삭제했습니다. README 디렉토리 전략에도
> "feature 간 직접 import 금지" 한 줄을 반영했습니다.
>
> ## 검증
>
> - `bun run lint:deps` — 4개 크루즈 전부 위반 0 (pre-commit 훅에서도 재통과)
> - `bun run typecheck` — 4개 패키지 통과
> - Biome check 통과
> - 테스트: web 5개·bff 94개 전부 통과. design-guide의 "Vite 서버 종료 안 됨" 경고와
>   bff의 exit code 99(스킵 6개 관련)는 이 변경과 무관한 기존 이슈입니다 — 실패한
>   테스트는 0개.
>
> 다음 순서는 2번(`version` 필드의 문서·계약·코드 삼자 모순 정리)입니다. 진행할까요?

## 작업 로그

- 2026-07-08: status.ts 승격 + 라우트 슬롯 주입 + 규칙 추가 + README 갱신.
  규칙은 고의 위반 파일로 error 발생 확인. lint:deps·typecheck·Biome·테스트 통과.
  커밋 ccd8b74, 푸시 완료.
