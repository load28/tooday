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
   태스크 파일에 완료일·커밋 해시를 기입하고, 이 인덱스의 표를 갱신한다.
   완료 태스크는 지우지 않는다 — 기록이 곧 이력이다.
5. **작업 로그**에 무엇을 했고 어떻게 검증했는지(lint/typecheck/test) 커밋 단위로 남긴다.

## 태스크

| # | 태스크 | 우선순위 | 상태 |
| --- | --- | --- | --- |
| T001 | [feature 간 직접 import 제거 + web-no-cross-feature 규칙](T001-web-cross-feature-boundary.md) | 높음 | ✅ 완료 |
| T002 | [FSD entities 레이어 부분 도입](T002-fsd-entities-layer.md) | 높음 | ✅ 완료 |
| T003 | [태스크 문서 관리 체계 구축](T003-task-docs-system.md) | 높음 | ✅ 완료 |
| T004 | [version 필드의 삼자 모순 정리](T004-version-field-contradiction.md) | 높음 | ✅ 완료 |
| T005 | [BFF user 모듈 수직 슬라이스 정상화](T005-bff-user-module-slice.md) | 높음 | ✅ 완료 |
| T006 | [폼 인프라 통일](T006-unify-form-infra.md) | 높음 | ✅ 완료 |
| T007 | [낙관적 업데이트 중복 제거 + 캐시 정책 컨벤션](T007-optimistic-update-dedup.md) | 중간 | ⬜ 대기 |
| T008 | [디자인 시스템 컨벤션 위반 2건 수정](T008-design-system-violations.md) | 중간 | ⬜ 대기 |
| T009 | [공유 프리미티브 추출 + 매직 값 토큰화](T009-shared-primitives-extraction.md) | 중간 | ⬜ 대기 |
| T010 | [BFF 잔여 정리 (pub 계약·config·SSE 401·sync 위치)](T010-bff-cleanups.md) | 중간 | ⬜ 대기 |
| T011 | [tRPC 프로시저 경로 문자열 하드코딩 제거](T011-trpc-path-strings.md) | 낮음 | ⬜ 대기 |
| T012 | [SSE 클라이언트 auth 경로 정리](T012-sse-client-auth.md) | 낮음 | ⬜ 대기 |
| T013 | [i18n 우회 문자열 이관](T013-i18n-bypasses.md) | 낮음 | ⬜ 대기 |
| T014 | [design-guide 토큰 드리프트 해소](T014-design-guide-token-drift.md) | 낮음 | ⬜ 대기 |
| T015 | [날짜 라벨 포맷 shared/time.ts로 집중화](T015-date-format-centralize.md) | 낮음 | ⬜ 대기 |
| T016 | [소소한 통일 (캐스트 가드·내비게이션 API)](T016-minor-consistency.md) | 낮음 | ⬜ 대기 |
