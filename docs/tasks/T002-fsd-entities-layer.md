# T002 — FSD entities 레이어 부분 도입

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-08
- 커밋: 9ceaab0

## 배경

T001에서 `STATUS_ORDER`를 `shared/`로 승격했지만, 기존 구조는 "도메인 무관
shared" 아니면 "feature" 둘뿐이라 **도메인 지식 + 여러 feature 공용** 코드
(`task-status.ts`, 기존 `project-color.ts`)가 shared에 들어가며 "shared = 도메인
무관" 명분을 침식하는 회색지대가 있었다. FSD의 entities 레이어가 정확히 이
문제를 푸는 단위다.

## 작업 내용

1. `shared/task-status.ts` → `entities/task/status.ts`,
   `shared/project-color.ts` → `entities/project/color.ts` 이동.
2. 의존 방향을 `routes → features → entities → shared`로 확장.
3. dependency-cruiser 규칙 추가: `web-entities-direction`(entities는 shared만
   import 가능), `web-no-cross-entity`(슬라이스 간 직접 import 금지).
4. [docs/conventions/web-entities.md](../conventions/web-entities.md) 신설 —
   **FSD는 전면 도입이 아니라 단위별 점진 채택** 원칙과 배치 판별표 명시.
   CLAUDE.md 인덱스·README 갱신.

기각한 대안: (a) shared에 그대로 두기 — 도메인 무관 명분 침식 지속.
(b) FSD 전면 도입 — feature 4개 규모에 6레이어 + 슬라이스별 배럴은 과함.

## 완료 기준

- [x] 도메인 공용 상수가 entities로 이동, shared에는 도메인 무관 코드만
- [x] 새 규칙 2개가 고의 위반 파일에서 실제 error를 냄 (검증 후 삭제)
- [x] 점진 채택 원칙이 컨벤션 문서로 명시되고 CLAUDE.md 인덱스에 등록
- [x] lint:deps / typecheck / Biome 통과

## 대화 기록

> **사용자**: fsd를 이용하먄 해결되지않나
>
> **Claude**: FSD도 슬라이스 간 import는 같은 금지 규칙이라 문제 자체가 사라지진
> 않지만, entities 레이어는 도메인 공용 상수의 정당한 자리를 준다. 다만 회색지대
> 파일이 2개뿐이니 지금은 보류하고 쌓이면 도입하자고 제안.
>
> **사용자**: 죄디 쉐어에 넣겠다는 말로빆에 안보임 걍 fsd에서 더 작은단위 하나만
> 넣느면 되자나 누가 다 구축하래? 부분적으로 점진적으로 확대하는거지. 이거 문서에 명시해
>
> **Claude**: 동의 — entities만 부분 도입 + 점진 확대 원칙 문서화 실행. 커밋 9ceaab0.
>
> **사용자**: 내말에 동의해?
>
> **Claude**: 동의. 도입 비용(파일 2개 + 규칙 2줄 + 문서 1장)을 과대평가해 불필요하게
> 보수적이었고, 미루는 동안 shared의 문서화된 원칙이 침식되고 있었으므로 방향(부분·
> 점진 채택)과 타이밍(지금)은 사용자가 옳았다. 단 "FSD가 feature UI 조립(NewProjectSheet)
> 문제까지 해결하지는 않는다"(라우트 주입이 여전히 정답)는 원래 논점은 유지.

## 작업 로그

- 2026-07-08: 파일 이동 + 규칙 2개 + web-entities.md + README/CLAUDE.md 갱신.
  고의 위반 파일 2개로 두 규칙 모두 error 확인(entities → shared 허용도 확인).
  lint:deps·typecheck·Biome 통과. 커밋 9ceaab0, 푸시 완료.
