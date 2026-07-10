# T023 — 웹 잔여 공통화·정리 (폼 조각·중복 레이아웃·죽은 코드)

- 상태: 대기
- 생성: 2026-07-10
- 완료: -
- 커밋: -

## 배경

재조사(2026-07-10)에서 발견된 web 쪽 중복·잔재. 개별로는 작지만 같은 결이라 한
태스크로 묶는다.

1. **폼 submit 버튼 + 폼 에러 JSX 4중 복제** — `login-screen.tsx:146-154`,
   `signup-screen.tsx:163-171`, `new-project-sheet.tsx:135-143`,
   `new-task-screen.tsx:183-191`에 동일한 `form.Subscribe`(onSubmit errorMap →
   danger Text) 블록과 거의 동일한 submit 버튼 subscribe가 반복된다. 폼 인프라의
   집인 `shared/form.ts`에 `<FormError form={...}/>`(+ 선택적으로 SubmitButton
   헬퍼)로 추출 — T006에서 필드 에러는 통일했지만 이 부분이 남았다.
2. **폼 스키마 no-op 클론 4곳** — `new-task-screen.tsx:24`, `signup-screen.tsx:11`,
   `login-screen.tsx:11`, `new-project-sheet.tsx:12`의
   `v.object({ ...xRequestSchema.entries })`. 원본이 이미 plain `v.object`라
   기능적 무의미 래퍼. 요청 스키마 직접 사용으로 교체 (디커플링이 의도면
   `formSchemaFrom()` 헬퍼로 문서화).
3. **auth 화면 레이아웃 중복** — `login-screen.tsx:21-32`와
   `signup-screen.tsx:21-32`의 `formCls`가 바이트 단위 동일 (+ 두 화면 구조
   ~95% 동일). 매직 값 `maxWidth: '420px'`,
   `paddingTop: 'clamp(48px, 16dvh, 140px)'`도 여기 있음 — 공통화하면서
   토큰화한다 (T024와 접점, 여기서 처리).
   `pageCls`도 `new-task-screen.tsx:34-41`/`task-detail-screen.tsx:24-31` 중복.
4. **EmptyState 프리미티브 후보** — `today-screen.tsx:53`,
   `projects-screen.tsx:30`, `project-detail-screen.tsx:40`이 각자
   `emptyCls`(paddingY: 'emptyStateY' …)와 아이콘+제목+설명 마크업을 반복.
   `emptyStateY` 토큰이 이미 이 프리미티브를 예고하고 있다.
5. **SegmentedControl 일관성** — 단일 선택 ToggleGroup 2곳의 아이템 스타일이
   다르다: `task-fields.tsx:197`(ScheduleSheet)은 `Button tone="subtle"
   shape="pill"`, `project-detail-screen.tsx:105`는 수제 `segmentButtonCls`.
   공유 프리미티브화 또는 한쪽으로 통일. 같은 파일의
   `<Text tone={tab === status ? ... : ...}>`(107행) JS 조건도 `_on`
   data-state로.
6. **죽은 것들** — 동작 없는 알림 벨 버튼(`today-screen.tsx:132-134`, onClick
   없음 — 기능 생길 때까지 제거), 미참조 i18n 키 `projectDetail.badge`
   (`schema.ts:84`), `common.more`(`schema.ts:23`) 삭제
   (`taskDetail.notFound`는 T020에서 배선).
7. **(낮음, 선택)** `task-detail-screen.tsx:58`의 `titleDraft`가 마운트 시점
   `task.title`로만 시드됨 — 외부 갱신 시 desync. `task.version` key 또는
   비포커스 시 리셋.

## 작업 내용

위 항목 순서대로. 1·2·3이 본체, 4·5는 프리미티브 추출(ui-composition.md 컨벤션
준수), 6은 삭제, 7은 여유 시.

## 완료 기준

- [ ] 폼 4곳의 에러/submit 렌더가 shared/form 헬퍼 소비로 통일
- [ ] no-op 스키마 클론 제거 또는 문서화된 헬퍼로 대체
- [ ] auth/pageCls 레이아웃 중복 해소 (+ 420px/clamp 토큰화)
- [ ] EmptyState 프리미티브로 3곳 교체
- [ ] 죽은 i18n 키·무동작 버튼 제거
- [ ] `bun run typecheck` / `bun run check` / 기존 테스트 통과

## 대화 기록

> **사용자**: 재조사를 하자 기존 14번 미처리로 결론을 내자
>
> **Claude** (web 조사 에이전트 보고 원문, 이 태스크 해당 부분):
>
> **3. Duplicated form submit-button + form-error JSX across all four forms**
> [중략] `shared/form.ts` is the established home for form infra [중략] This is
> a straggler: field-error/message handling was unified, but the submit/error
> render was not.
>
> **5. Redundant schema clones repeated in 4 forms** [중략] the clone is a
> functional no-op wrapper duplicated 4×.
>
> **4. Non-functional "notifications" bell renders as an actionable control**
> [중략] **6. Dead i18n keys left over from refactors** [중략]
> **7. Duplicated layout `css()` constants within features** [중략]
>
> (디자인 시스템 조사 에이전트 보고 원문):
>
> **Auth form layout duplication** [중략] Should become a shared
> `AuthLayout`/`FormScreen` primitive. **Empty-state pattern duplication**
> [중략] the `emptyStateY` token already anticipates this. **Segmented control
> vs. Button-subtle toggle inconsistency** [중략]

## 작업 로그

- (없음)
