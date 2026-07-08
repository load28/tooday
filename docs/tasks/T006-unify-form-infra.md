# T006 — 폼 인프라 통일

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
- 커밋: -

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

- [ ] 모든 폼이 같은 인프라(TanStack Form + valibot + shared/form.ts)를 사용
- [ ] 생성 요청이 valibot 스키마 검증을 통과해서 나감
- [ ] typecheck / web 테스트 통과, 수동 동작 확인(/verify 스킬)

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

## 작업 로그

- (없음)
