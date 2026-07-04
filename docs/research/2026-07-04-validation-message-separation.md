# 기술조사: 검증 스키마와 사용자향 에러 메시지 분리

**배경**: 공유 스키마가 검증 규칙과 메시지 문자열을 함께 들고 있다.

```ts
// packages/shared/src/auth.ts
export const signupRequestSchema = z.object({
  email: z.email('올바른 이메일이 아닙니다.'),          // 사용자향 톤
  password: z.string().min(MIN_PASSWORD_LENGTH, `password는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`), // 개발자향 톤
  name: z.string().trim().min(1, 'name이 필요합니다.'),  // 개발자향 톤
});
```

이 방식의 문제: (1) 검증(도메인 계약)과 프레젠테이션(문구)이 한 곳에 결합되어 같은 규칙 위반이라도 서버 응답용 메시지와 화면용 메시지를 다르게 줄 수 없음, (2) 실제로 톤이 섞이기 시작함 — 회원가입 화면에 "password는 8자 이상이어야 합니다."가 그대로 노출, (3) i18n 도입 시 구조적으로 막힘(아래 §1), (4) 문구 수정이 `@tooday/shared` 변경 → BFF/웹 동시 재배포를 유발.

**목표**: 스키마는 검증만 하고, 사용자향 메시지는 프레젠테이션 계층이 소유하는 구조 조사.

---

## 1. Zod v4의 공식 메커니즘

- **통합 `error` 파라미터**: 하드코딩 문자열은 여러 메커니즘 중 하나일 뿐이다. `error`에는 issue 컨텍스트를 받는 error map 함수도 넣을 수 있고, issue는 `code`(`invalid_type`/`too_small`/`too_big`…)로 판별하는 discriminated union이라 **code 기반 메시지 매핑이 1급 지원**이다. ([error-customization](https://zod.dev/error-customization))
- **명시적 우선순위 체인**: schema-level `error` > per-parse `error` > 전역 `z.config({ customError })` > locale. 스키마를 메시지-프리로 두면 메시지 해석이 자연스럽게 전역/프레젠테이션 계층으로 내려간다.
- **⚠️ v4의 우선순위 역전**: v3와 달리 `.parse()`에 넘긴 error map이 **schema-level 메시지를 이기지 못한다**. 즉 스키마에 문자열을 박아두면 나중에 어떤 i18n/매핑 계층을 얹어도 그 문자열이 항상 이긴다. 스키마 하드코딩이 "지금은 편하지만 되돌리기 어려운" 선택인 기술적 근거. ([v4 changelog](https://zod.dev/v4/changelog))
- **i18n 내장**: 47개 locale error map을 `z.config(z.locales.ko())`로 전역 설정 가능(기본은 `en` 자동 로드). 단 `z.config()`는 프로세스 전역이라 SSR에서 요청별 locale 전환에는 제약이 있다(zod#4913).
- **v3 레시피 주의**: per-check `{ message }`는 deprecated(`error`로 대체), `ZodError.flatten()/.format()`도 deprecated → `z.flattenError()`/`z.treeifyError()`가 현행. tRPC 커뮤니티의 `errorFormatter + error.cause.flatten()` 스니펫을 그대로 복사하면 안 된다.

## 2. 생태계 관행

| 사례 | 패턴 | 시사점 |
|---|---|---|
| **공식 tRPC + RHF 예제** (kitchen-sink) | 커스텀 메시지 없는 공유 스키마 + zodResolver 기본 메시지, 서버 에러는 `root.server` 폼-레벨로 collapse | 공식 예제조차 최소 구성 — 정교한 분리가 "필수 표준"은 아님 |
| **zod-validation-error** (주간 ~3,100만 DL) | ZodIssue 배열 → 사용자향 문자열을 만드는 MessageBuilder, 원본 issue는 `details`에 보존 | "raw zod 에러는 사용자에게 직접 노출 부적합"이라는 업계 공감대의 증거 |
| **zod-i18n** | `setErrorMap(zodI18nMap)` + refine에 번역 키 부착 | "스키마는 키 emit, i18n이 해석" 패턴의 선구자였으나 **v4 미지원**(colinhacks가 직접 이슈 제기, 무응답, 2024-01 이후 릴리스 없음) — 신규 도입 불가 |
| **react-hook-form + zodResolver** | 클라이언트 검증은 스키마 메시지(또는 기본 메시지)를 `formState.errors`로 렌더 | 폼 생태계는 "스키마가 주는 메시지를 그대로 보여주는" 쪽으로 기울어 있음 — 분리하려면 error map 계층을 직접 세워야 함 |

## 3. 실전 사례: cal.com (대형 프로덕션 모노레포)

한 코드베이스 안에 세 패턴이 공존한다 (`packages/prisma/zod-utils.ts`, 2026-07 main 기준):

1. **영어 하드코딩** — `.email({ message: 'Invalid email' })` 등. 대기업도 일관되게 분리하지 못한다.
2. **TFunction 스키마 팩토리** — `(t: TFunction) => z.string().min(1, t('error_required_field'))`. 스키마 구성 시점에 번역을 주입. 요청별 locale이 필요한 SSR에서 유효하지만, 스키마가 i18n 런타임에 의존하게 되어 "공유 스키마"로는 못 쓴다.
3. **rule key emit** — 비밀번호 검증이 `superRefine` + `ctx.addIssue({ path: [key], message: 'caplow' | 'num' | 'min' })`로 **사람 문장이 아닌 기계 키**를 emit하고, UI 컴포넌트(`HintOrErrors`)가 `t(\`${field}_hint_${key}\`)`로 텍스트를 매핑. **"스키마는 코드, 프레젠테이션이 문구"의 실전 증거.**

## 4. 패턴 비교

| 패턴 | 메시지 소유 | 장점 | 단점 |
|---|---|---|---|
| **A. 스키마 하드코딩** (현재) | 공유 스키마 | 구현 최단, 클라·서버 문구 자동 일치 | 톤 혼재, 서버/화면 문구 분리 불가, v4에선 i18n으로 되돌리기 어려움 |
| **B. 메시지-프리 스키마 + 전역 error map** | 각 앱 진입점 (`z.config`) | 스키마는 순수 계약, 웹은 사용자 문구·BFF는 로그 문구로 각자 소유 | error map 작성 비용, code→문구 매핑이 한 단계 추가 |
| **C. rule key emit + 프레젠테이션 매핑** | UI 컴포넌트/사전 | 복잡한 도메인 규칙(비밀번호 조합 등)에 적합, i18n 자연 확장 | 규칙마다 키 사전 관리 필요, 단순 필드엔 과잉 |
| **D. TFunction 스키마 팩토리** | i18n 런타임 | 요청별 locale 대응 | 스키마가 i18n에 의존 → 공유 패키지 계약으로 부적합 |

## 5. 권장 설계 (TooDay 기준)

소규모 팀 + 한국어 단일 + 공유 스키마(웹 폼 검증 ↔ BFF input 검증 겸용) 조건에서는 **B를 기본, C를 예외적으로**:

1. **`@tooday/shared` 스키마에서 메시지 전부 제거** — `z.email()`, `z.string().min(8)`처럼 규칙만 남긴다. `MIN_PASSWORD_LENGTH` 같은 상수는 계약이므로 유지.
2. **웹**: 라우터 진입점에서 한 번 `z.config({ customError })`로 issue `code`/`path` 기반 한국어 매핑을 등록한다(또는 `z.locales.ko()` + 필드별 오버라이드). 폼별 특수 문구가 필요하면 그 폼의 safeParse 결과에서 code로 분기 — 지금 signup-screen이 issue를 순회해 필드 에러로 바꾸는 지점이 이미 그 자리다.
3. **BFF**: zod 메시지는 개발자/로그용이므로 기본(en) 그대로 두거나 `z.locales.ko()`만 설정. 사용자향 서버 에러는 이미 `DomainError(code + 기본 메시지)` 구조가 올바른 방향 — 장기적으로는 클라이언트가 `error.data.code`(`EMAIL_TAKEN` 등)로 매핑하고 서버 `message`는 폴백으로만 쓰는 쪽으로 강화한다.
4. **도메인 특화 규칙**(예: 비밀번호 조합 조건이 생기면): cal.com처럼 `ctx.addIssue({ message: ruleKey })`로 키를 emit하고 프레젠테이션에서 문구로 변환한다.
5. **하지 말 것**: zod-i18n 도입(v4 미지원), v3식 `{ message }`·`.flatten()` 레시피 복사, 스키마에 사용자 문구 추가(우선순위 역전 때문에 이후 매핑 계층이 무력화됨).

**조사 한계**: 생태계 사례(tRPC 예제, cal.com)는 대부분 zod v3 시대 코드라 "실무 사례 = v4 모범 사례"는 아니다. "errorFormatter + flatten이 tRPC 공식 권장"이라는 통설은 검증에서 기각됐다(문서에 예시로만 존재). supabase/documenso 등 다른 대형 코드베이스는 검증된 근거를 확보하지 못했다.

---

## 결정 (2026-07-04)

C 패턴을 채택하되 zod 대신 **valibot**으로 구현했다. 결정적 근거: zod는 스키마 타입에서 규칙 정보가 지워져 "필드별 발생 가능 에러 종류"를 추론할 수 없지만, valibot은 `v.InferIssue<(typeof schema.entries)['email']>['type']`으로 필드별 issue 타입 유니언이 추론된다. 이를 이용해 각 화면이 `FormMessages<typeof schema>`(apps/web/src/shared/form.ts)로 문구를 소유하며, 존재하지 않는 필드 키나 그 필드에서 발생 불가능한 issue 타입은 컴파일 에러가 된다. 전역 error map/locale 설정은 제거 — i18n은 화면 컴포넌트 레벨 책임으로 두는 것이 SSR(요청 스코프)에서도 가장 깨끗하다. tRPC v11과 TanStack Form 모두 Standard Schema로 valibot을 그대로 받는다.
