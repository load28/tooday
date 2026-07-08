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
> **Claude**: 4방향 병렬 조사(디자인 시스템 / BFF / 레이어링·타입 / 프론트 패턴) 후
> 종합 보고. 최우선 발견: feature 간 직접 import 2건 + 웹에만 dep-cruiser 규칙 공백.
> 추천 착수 순서 1번으로 "가드레일부터 — `web-no-cross-feature` 규칙 추가 + 위반 2건
> 해소. 이걸 먼저 해야 이후 정리가 안 무너집니다" 제시.
>
> **사용자**: 1번 먼저수정하자
>
> **Claude**: 위 작업 내용대로 수정, 검증, 커밋(ccd8b74)·푸시 완료.

## 작업 로그

- 2026-07-08: status.ts 승격 + 라우트 슬롯 주입 + 규칙 추가 + README 갱신.
  규칙은 고의 위반 파일로 error 발생 확인. lint:deps·typecheck·Biome·테스트 통과.
  커밋 ccd8b74, 푸시 완료.
