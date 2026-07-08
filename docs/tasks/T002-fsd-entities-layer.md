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
> **Claude** (원문):
>
> 좋은 질문인데, 결론부터 말하면 **FSD를 도입해도 이 문제 자체가 사라지지는
> 않습니다. FSD도 같은 금지 규칙을 갖고 있고, 대신 "어디에 두라"는 표준 답(레이어)을
> 더 제공하는 것뿐입니다.** 방금 한 수정이 사실상 FSD가 시키는 것과 같은 해법입니다.
>
> ## 방금 고친 2건을 FSD 관점으로 보면
>
> **cross-feature import (tasks → projects)** — FSD에서도 같은 레이어의 슬라이스끼리
> import는 똑같이 금지입니다 (public API `@x` 표기라는 예외가 있지만 entities 레이어용
> 관례입니다). FSD의 답은 "조립을 상위 레이어(widgets/pages)로 올려라"인데, 이번에 한
> 라우트 주입이 정확히 그것입니다 — 이 프로젝트에서는 routes/가 FSD의 pages 역할입니다.
>
> **STATUS_ORDER 공용 문제** — 여기는 FSD가 실제로 더 나은 답을 가진 부분입니다.
> FSD에는 `entities` 레이어(도메인 개념 — Task, Project의 모델·표시 상수)가 있어서
> `entities/task`가 status 순서·tone 매핑의 정당한 집이 됩니다. 지금 구조는 "도메인
> 무관 shared" 아니면 "feature" 둘뿐이라, `task-status.ts`나 기존 `project-color.ts`처럼
> **도메인 지식이 있지만 여러 feature가 쓰는 코드**가 shared에 들어가며 "shared =
> 도메인 무관" 명분을 조금씩 침식합니다. 이 회색지대가 FSD entities가 해결하는 지점입니다.
>
> ## 그럼 전면 도입할 가치가 있나
>
> 지금 시점엔 비용 대비 이득이 작다고 봅니다:
>
> - 현재 구조가 이미 **FSD-lite**입니다: `routes(≈pages) → features → app/shared`
>   단방향 + 이번에 추가한 cross-feature 금지 규칙. FSD의 핵심 보장(단방향 레이어 +
>   슬라이스 격리)은 이미 dependency-cruiser로 강제되고 있습니다.
> - feature가 4개(auth, today, tasks, projects)뿐인 앱에 entities/widgets/pages
>   6레이어 + 슬라이스별 public API(index.ts 배럴)는 과합니다. 특히 슬라이스마다
>   배럴을 두는 FSD 관례는 이 저장소의 "features에 배럴 없음" 컨벤션과 충돌합니다.
> - 회색지대에 해당하는 파일이 현재 딱 2개(`project-color.ts`, `task-status.ts`)입니다.
>   2개 파일 때문에 레이어 하나를 도입할 단계는 아닙니다.
>
> **추천**: 지금은 이대로 두고, 도메인 공용 코드가 더 쌓이면(예: 나중에 task 공유
> 기능이 들어와 Task 표시 로직이 여러 feature로 퍼질 때) 그때 `entities/` 성격의
> 레이어 하나만 FSD에서 빌려와 `shared/task-status.ts`, `shared/project-color.ts`를
> 옮기고 dep-cruiser 규칙을 한 줄 추가하면 됩니다. 전면 FSD 전환 없이 필요한 개념만
> 가져오는 게 이 코드베이스의 "라이트" 철학과도 맞습니다.
>
> 참고로 FSD는 프론트엔드 방법론이라 BFF 쪽 발견(user 모듈, platform 스키마 집중)에는
> 해당이 없습니다 — 그쪽은 헥사고날 정리 문제입니다.
>
> 이대로 다음 항목(2번 — `version` 필드 모순 정리)으로 넘어갈까요, 아니면 entities
> 레이어를 지금 도입해 볼까요?
>
> **사용자**: 죄디 쉐어에 넣겠다는
> 말로빆에 안보임 걍 fsd에서 더 작은단위 하나만 넣느면 되자나 누가 다 구축하래?
> 부분적으로 점진적으로 확대하는거지. 이거 문서에 명시해
>
> **Claude** (완료 보고 원문):
>
> FSD의 entities 레이어만 부분 도입하고 문서에 명시했습니다. 커밋·푸시 완료.
>
> ## 변경 내용
>
> **entities 레이어 신설** — `shared/task-status.ts`와 `shared/project-color.ts`(기존부터
> shared에 있던 도메인 상수)를 `entities/task/status.ts`, `entities/project/color.ts`로
> 옮겼습니다. 이제 "도메인 지식 + 여러 feature 공용" 코드는 shared가 아니라 entities에
> 갑니다. 의존 방향은 `routes → features → entities → shared`.
>
> **dependency-cruiser 규칙 2개 추가** (둘 다 고의 위반 파일로 실제 error가 나는 것 확인):
> - `web-entities-direction` — entities는 shared만 import 가능
> - `web-no-cross-entity` — entities 슬라이스끼리 직접 import 금지
>
> **문서 명시** — `docs/conventions/web-entities.md`를 새로 만들어 원칙을 박았습니다:
> **"FSD를 통째로 도입하지 않는다. 필요가 증명된 단위만 하나씩 들여온다. 현재 채택
> 단위는 entities 하나"** — widgets 등 다음 단위도 같은 필요가 실제로 쌓일 때 규칙·
> 문서와 함께 추가한다고 명시했습니다. 무엇을 어디에 두는지 판별 표(도메인 무관→shared /
> 한 feature 전용→feature 안 / 도메인 공용→entities / UI 조립→routes)도 포함했습니다.
> CLAUDE.md 인덱스와 README 디렉토리 전략에도 등록했습니다.
>
> **검증** — lint:deps 4개 크루즈 위반 0, typecheck 4개 패키지 통과, Biome 통과.
>
> 앞서 1번에서 shared에 뒀던 게 어정쩡했던 건 맞고, 이제 entities가 그 자리를
> 정식으로 맡습니다. 다음은 2번(`version` 필드 문서·계약·코드 삼자 모순 정리)인데,
> 진행할까요?
>
> **사용자**: 내말에 동의해?
>
> **Claude** (원문):
>
> 네, 동의합니다 — 그리고 제 처음 판단이 틀렸던 지점도 짚겠습니다.
>
> **당신 말이 맞았던 부분**: 저는 "회색지대 파일이 2개뿐이니 더 쌓이면 도입하자"고
> 미뤘는데, 실제 도입 비용은 파일 2개 이동 + 규칙 2줄 + 문서 1장, 몇 분짜리였습니다.
> 비용이 이렇게 작으면 "나중에"가 사주는 게 없습니다. 오히려 미루는 동안
> `task-status.ts`가 shared에 앉아서 "shared = 도메인 무관"이라는 문서화된 원칙을
> 침식하고 있었고요 — 그 원칙 침식을 문제라고 지적한 건 저 자신이었으니, 제 1번
> 수정은 반쪽짜리였던 셈입니다. "전면 도입은 과하다"를 "도입하지 말자"로 잘못 연결한
> 것이고, FSD는 애초에 단위별 부분 채택이 공식 사용법이라는 당신 지적이 정확합니다.
>
> **다만 유지하는 부분 하나**: "FSD를 쓰면 이 문제가 해결되지 않나"에 대한 기술적 답
> 자체는 여전히 "절반만"입니다. entities는 STATUS_ORDER 같은 도메인 상수 공유는 깔끔히
> 해결했지만, `NewProjectSheet`처럼 **feature UI를 다른 feature 화면에 끼워 넣는 조립**
> 문제는 FSD에서도 슬라이스 간 직접 import 금지라 라우트(pages) 주입이 그대로
> 정답입니다. 그건 레이어를 더 들여와도 사라지지 않는 구조적 규칙이에요.
>
> 요약하면: 방향(부분·점진 채택)과 타이밍(지금)은 당신이 옳았고, 저는 도입 비용을
> 과대평가해서 불필요하게 보수적이었습니다. "FSD가 만능 해법은 아니다"라는 원래 논점
> 하나만 여전히 유효합니다.

## 작업 로그

- 2026-07-08: 파일 이동 + 규칙 2개 + web-entities.md + README/CLAUDE.md 갱신.
  고의 위반 파일 2개로 두 규칙 모두 error 확인(entities → shared 허용도 확인).
  lint:deps·typecheck·Biome 통과. 커밋 9ceaab0, 푸시 완료.
