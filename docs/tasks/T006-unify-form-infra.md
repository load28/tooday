# T006 — 폼 인프라 통일

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-08
- 커밋: (기입 예정)

## 배경

프론트 최대 비일관성. 폼 4개 중 2개만 폼 인프라를 쓴다:

- `features/auth/login-screen.tsx`·`signup-screen.tsx` — TanStack Form(`useForm`,
  `revalidateLogic`, `form.Field`, `form.Subscribe`) + valibot 계약 파생 +
  `shared/form.ts` 툴킷(`useFormMessages`, `fieldErrors`, `hasTrpcErrorCode` 등)으로
  필드 검증·서버 에러→필드 매핑·제출 상태를 전부 처리.
- `features/projects/new-project-sheet.tsx:40-57`·`features/tasks/new-task-screen.tsx:62-88`
  — `useState` 여러 개 + 수동 `canCreate`(비어있는지만 검사) + 수동 mutate.
  valibot 스키마 검증을 안 타고, 제출 버튼 disabled + `isError → unexpected` 관용구를
  손으로 재구현.

`shared/form.ts`는 스키마 타입드 폼 추상화인데 소비처가 auth 2곳뿐이다.

## 작업 내용

생성 폼 2개(new-project-sheet, new-task-screen)를 TanStack Form +
`packages/shared` valibot 스키마 + `shared/form.ts`로 이관해 auth 화면과 같은
패턴으로 통일한다.

## 완료 기준

- [x] 모든 폼이 같은 인프라(TanStack Form + valibot + shared/form.ts)를 사용
- [x] 생성 요청이 valibot 스키마 검증을 통과해서 나감
- [x] typecheck / web 테스트 통과, 수동 동작 확인(/verify 스킬)

## 대화 기록

> **사용자**: 그가뿐 아니라 프론트 코드도 예외적으로 된부분 포함
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> **4. 폼 인프라가 절반만 채택됨 — 프론트 최대 비일관성**
> - auth 화면 2개는 TanStack Form + valibot + `shared/form.ts` 전체 툴킷(필드 검증,
>   서버 에러→필드 매핑)을 쓰는데, `new-project-sheet.tsx`와 `new-task-screen.tsx`는
>   `useState` 여러 개 + 수동 `canCreate` + 수동 mutate로 손으로 다 짭니다. valibot
>   스키마 검증도 안 탑니다. `shared/form.ts`라는 잘 만든 추상화가 있는데 소비처가
>   auth 2곳뿐입니다.
>
> (프론트 패턴 조사 에이전트 보고 원문, 1순위 발견):
>
> **1. Forms: two features use a full form framework + the shared form infra, the
> other two hand-roll it** — This is the single biggest inconsistency. [...]
> `shared/form.ts` is a purpose-built, schema-typed form abstraction that exists in
> the repo but is consumed by **only** the two auth screens. The project/task create
> forms don't validate against their valibot schemas at all (they only check
> non-empty title/name). Same submit-button-disabled + `create.isError →
> t.common.error.unexpected` idiom is re-implemented by hand in each.
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

### 2026-07-08 착수

> **사용자**: 남은 태스크 중 하나를 진행하고자한다 뭔지보여줘
>
> **Claude**: 남은 태스크는 총 11개입니다 (T006–T016, 모두 대기 상태). 우선순위별로 정리하면:
>
> **높음**
> - **T006 — 폼 인프라 통일**: 폼 4개 중 auth 2개만 TanStack Form + valibot + `shared/form.ts`를 쓰고, `new-project-sheet`와 `new-task-screen`은 `useState` 수동 배선. 이 2개를 auth와 같은 패턴으로 이관.
>
> [중략 — T007~T016 요약]
>
> 우선순위 순서대로라면 다음 차례는 **T006 (폼 인프라 통일)** 입니다 — 유일하게 남은 "높음"이고, 태스크 문서에 "프론트 최대 비일관성"으로 기록돼 있습니다. 어느 것을 진행할지 알려주시면 시작하겠습니다.
>
> **사용자**: 6번진행하자

## 작업 로그

- **이관 방식** — auth 화면과 동일한 패턴으로 통일:
  - 폼 스키마는 `packages/shared` 요청 스키마의 entries 스프레드로 파생
    (`v.object({ ...createProjectRequestSchema.entries })`,
    `v.object({ ...createTaskRequestSchema.entries })`) — auth의
    `loginFormSchema`/`signupFormSchema`와 같은 방식.
  - `useForm` + `revalidateLogic()` + `validators.onDynamic`(스키마 검증) +
    `validators.onSubmitAsync`(mutateAsync → 실패 시 `formError(t.common.error.unexpected)`).
  - 수동 `isError → unexpected` 블록을 `form.Subscribe`(errorMap.onSubmit)로 교체,
    제출 버튼은 `type="submit"` + `form.Subscribe`([values, isSubmitting])로 disabled/loading.
  - 필드 문구는 `useFormMessages` — i18n에 `projectNew.nameRequired`,
    `taskNew.titleRequired` 키 추가 (schema.ts + ko.ts).
- **new-project-sheet.tsx** — name은 `form.Field` + TextField(error 배선),
  color는 `form.Field` + ColorSwatchGroup(`onValueChange={field.handleChange}`).
  `useState` 2개 제거, `<form noValidate>` 래핑.
- **new-task-screen.tsx** — title/projectId/date/startAt/durationMin 전부 폼 값으로
  (date는 `toIsoDate(new Date(now))` 기본값). 시트 open/close 플래그만 `useState`로
  남김(UI 상태). 시트 콜백은 `form.setFieldValue`, MetaRow 표시는
  `useStore(form.store, …)`. title 필드 에러는 인라인 Text로 표면화.
- **검증** — `bun run typecheck`(4 패키지), `bun run check`(Biome), web `vitest run`
  5개 통과, `bun run lint:deps` 위반 없음. design-guide 테스트는 이 컨테이너의
  Vite 종료 타임아웃으로 exit 1이나 테스트 자체는 통과(변경 무관 워크스페이스).
  /verify 스킬로 E2E 수동 확인: 회원가입 → 새 태스크 화면에서 빈/공백 제목 시
  버튼 disabled, 새 프로젝트 시트에서 빈 이름 disabled → 이름 입력·색상(보라) 선택
  → 생성 → 시트 닫힘·선택 반영(서버 응답 `color: "violet"` 확인) → 태스크 생성 →
  /today에 09:00/30분/프로젝트 라벨로 표시.
