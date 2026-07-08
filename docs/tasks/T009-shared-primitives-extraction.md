# T009 — 공유 프리미티브 추출 + 매직 값 토큰화

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
- 커밋: -

## 배경

feature 코드에 복붙되었거나 shared/ui로 승격돼야 할 로컬 프리미티브들:

- **borderless 타이틀 input** — `titleInputCls`가 `features/tasks/new-task-screen.tsx:31-41`과
  `task-detail-screen.tsx:30-40`에 byte 동일 복붙. raw `<input>`이 `shared/ui/input.tsx` +
  `recipes/input.ts`가 소유한 리셋·placeholder 처리를 재구현.
- **TabBar 설정** — today/projects 2탭 하단 내비가 `today-screen.tsx`,
  `projects-screen.tsx`, `project-detail-screen.tsx` 3곳에 복붙. `onSelect` 분기가
  화면마다 미묘하게 다름(한쪽만 처리 vs 양쪽 처리).
- **진행률 바** — `projects-screen.tsx:31-42`의 trackCls/fillCls + inline style. 재사용
  프리미티브가 feature에 삶.
- **매직 px** — `60px` 빈 상태 패딩이 3개 화면 중복, `52px`(= `sizes.appBar` 토큰 존재),
  `36px`(= 미사용 `sizes.handle`), `14px`·`48px` 등 스페이싱 스케일 우회.
- `titleDoneCls`(line-through)가 `task-card.tsx:25`와 `project-detail-screen.tsx:44`에 중복.
- `fullWidthCls = css({ width: '100%' })`가 5개 이상 파일에 재정의.

## 작업 내용

1. `Input`에 borderless/inline variant 추가 → 두 화면에서 사용.
2. `AppTabBar`(today/projects 내비 프리셋) 추출 — 자리는 착수 시 결정
   (도메인 라벨이 있으므로 shared/ui보다 entities 또는 features 공용 조립 검토).
3. 진행률 바를 shared/ui 프리미티브로.
4. 매직 px를 기존 토큰으로 치환, 반복되는 값(빈 상태 패딩 등)은 토큰 추가.

## 완료 기준

- [ ] 위 중복 항목이 각각 단일 소유처를 가짐
- [ ] ui-styling.md 규칙(variant 우선, className은 배치만) 준수
- [ ] typecheck / web 테스트 통과, 화면 회귀 없음(/verify 스킬)

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (조사 보고 중): "태스크 화면 2곳에 복붙된 borderless input, TabBar 설정
> 3곳 복붙(onSelect 분기 제각각), feature에 사는 진행률 바, 60px 빈 상태 패딩 3곳
> 중복 등 매직 px 다수."
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
