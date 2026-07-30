# 태스크 인덱스

모든 작업은 태스크 문서로 관리한다. 이 파일은 각 태스크 파일을 참조해 상태를
표시하는 인덱스다 — **상태의 진실은 각 태스크 파일 머리의 `상태` 필드**이고,
이 표는 그것을 반영한다.

## 관리 규칙

1. **작업은 무조건 태스크 파일로 시작한다.** 새 지시를 받으면 코드를 만지기 전에
   [\_template.md](_template.md)를 복사해 태스크 파일부터 만든다.
2. **하나의 태스크 = 하나의 파일.** 파일명은 `T###-슬러그.md` (번호는 인덱스의
   마지막 번호 + 1).
3. **문맥을 위해 해당 대화 전체를 파일에 기록한다.** 태스크를 만들었거나 방향을
   바꾼 대화를 「대화 기록」 섹션에 남긴다 — **요약하지 않고 사용자 발화와
   어시스턴트 응답 모두 원문 그대로** (무관한 부분만 `[중략]` 가능). 진행 중
   새 대화가 생기면 append 한다.
4. **완료 여부로 관리한다.** 상태는 `대기 → 진행중 → 완료` 세 가지. 완료 시
   태스크 파일에 완료일을 기입하고 이 인덱스의 표를 갱신한다 — 가능하면 그 태스크의
   커밋 안에서 함께 한다. **커밋 해시는 문서에 기입하지 않는다**: 커밋 메시지의
   `(T0XX)`로 매핑돼 `git log --grep=T0XX`로 찾는다. 완료 태스크는 지우지 않는다 —
   기록이 곧 이력이다.
5. **작업 로그**에 무엇을 했고 어떻게 검증했는지(lint/typecheck/test) 커밋 단위로 남긴다.
6. **커밋은 태스크 단위로 하고, 커밋 제목 끝에 `(T0XX)`로 태스크 번호를 명시한다** —
   절대 규칙. 상세는 [conventions/git-commits.md](../conventions/git-commits.md).

## 태스크

| # | 태스크 | 우선순위 | 상태 |
| --- | --- | --- | --- |
| T001 | [feature 간 직접 import 제거 + web-no-cross-feature 규칙](T001-web-cross-feature-boundary.md) | 높음 | ✅ 완료 |
| T002 | [FSD entities 레이어 부분 도입](T002-fsd-entities-layer.md) | 높음 | ✅ 완료 |
| T003 | [태스크 문서 관리 체계 구축](T003-task-docs-system.md) | 높음 | ✅ 완료 |
| T004 | [version 필드의 삼자 모순 정리](T004-version-field-contradiction.md) | 높음 | ✅ 완료 |
| T005 | [BFF user 모듈 수직 슬라이스 정상화](T005-bff-user-module-slice.md) | 높음 | ✅ 완료 |
| T006 | [폼 인프라 통일](T006-unify-form-infra.md) | 높음 | ✅ 완료 |
| T007 | [낙관적 업데이트 중복 제거 + 캐시 정책 컨벤션](T007-optimistic-update-dedup.md) | 중간 | ✅ 완료 |
| T008 | [디자인 시스템 컨벤션 위반 2건 수정](T008-design-system-violations.md) | 중간 | ✅ 완료 |
| T009 | [공유 프리미티브 추출 + 매직 값 토큰화](T009-shared-primitives-extraction.md) | 중간 | ✅ 완료 |
| T010 | [BFF 잔여 정리 (pub 계약·config·SSE 401·sync 위치)](T010-bff-cleanups.md) | 중간 | ✅ 완료 |
| T011 | [tRPC 프로시저 경로 문자열 하드코딩 제거](T011-trpc-path-strings.md) | 낮음 | ✅ 완료 |
| T012 | [SSE 클라이언트 auth 경로 정리](T012-sse-client-auth.md) | 낮음 | ✅ 완료 |
| T013 | [i18n 우회 문자열 이관](T013-i18n-bypasses.md) | 낮음 | ✅ 완료 |
| T014 | [design-guide 토큰 드리프트 해소](T014-design-guide-token-drift.md) | 낮음 | ➖ 미처리 (종결) |
| T015 | [날짜 라벨 포맷 shared/time.ts로 집중화](T015-date-format-centralize.md) | 낮음 | ✅ 완료 |
| T016 | [소소한 통일 (캐스트 가드·내비게이션 API)](T016-minor-consistency.md) | 낮음 | ✅ 완료 |
| T017 | [동기화 읽기 스냅샷 일관성 (영구 유실 버그)](T017-sync-read-snapshot-consistency.md) | 높음 | ⬜ 대기 |
| T018 | [리프레시 토큰 회전 원자성](T018-refresh-rotation-atomicity.md) | 높음 | ⬜ 대기 |
| T019 | [BFF 운영 견고화 (config 검증·장애 가시성)](T019-bff-operational-hardening.md) | 중간 | ⬜ 대기 |
| T020 | [낙관적 뮤테이션 에러 표면화 + 라우트 에러 경계](T020-mutation-error-surfaces.md) | 중간 | ⬜ 대기 |
| T021 | [계약 단일 선언 잔여 (드리프트 봉인)](T021-contract-single-declaration.md) | 중간 | ⬜ 대기 |
| T022 | [계약·동기화 테스트 공백](T022-contract-test-gaps.md) | 중간 | ⬜ 대기 |
| T023 | [웹 잔여 공통화·정리 (폼 조각·중복 레이아웃)](T023-web-shared-scaffolds.md) | 낮음 | ⬜ 대기 |
| T024 | [디자인 토큰 위생 (panda.config 정합)](T024-design-token-hygiene.md) | 낮음 | ⬜ 대기 |
| T025 | [비활성 룩을 opacity에서 전용 중립 토큰으로 교체](T025-disabled-token-neutralize.md) | 중간 | ✅ 완료 |
| T026 | [PGlite 데이터 디렉토리 부모 미생성으로 BFF 기동 실패](T026-pglite-datadir-mkdir.md) | 높음 | ✅ 완료 |
| T027 | [Panda 커스텀 레시피가 내장 패턴 이름과 충돌 (config 경고)](T027-panda-recipe-pattern-name-collision.md) | 낮음 | ✅ 완료 |
| T028 | [커밋 컨벤션 신설 — 태스크 단위 + 태스크 번호](T028-commit-convention-task-number.md) | 높음 | ✅ 완료 |
| T029 | [탭 전환 빈 화면·멈칫 제거 (클라이언트 캐시 수명 정상화)](T029-web-cache-lifetime.md) | 높음 | ✅ 완료 |
| T030 | [탭바를 레이아웃으로 호이스팅 (탭 전환 시 탭바 유지)](T030-tab-bar-layout-hoist.md) | 중간 | ✅ 완료 |
| T031 | [세션 프로브(user.me) optional-auth — 익명 200+null, 무효 401](T031-session-probe-optional-auth.md) | 높음 | ✅ 완료 |
| T032 | [로그아웃 UI (설정 화면 셸) 신설](T032-web-logout-settings.md) | 중간 | ✅ 완료 |
| T033 | [z-index 매직넘버를 Panda overlay 토큰으로](T033-zindex-overlay-token.md) | 낮음 | ✅ 완료 |
| T034 | [카드 press 피드백을 scale에서 state-layer로](T034-card-press-state-layer.md) | 중간 | ✅ 완료 |
| T035 | [버튼 TDS식 hover/press (framer-motion 스프링)](T035-button-tds-press-hover.md) | 중간 | ✅ 완료 |
| T036 | [BFF task 슬라이스 Rust 포팅 + 타입 추론 비교](T036-bff-rust-typescript-comparison.md) | 낮음 | ✅ 완료 |
