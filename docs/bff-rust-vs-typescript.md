# BFF Rust 포팅 — TypeScript 대비 타입 추론 비교 (T036)

`apps/bff`의 task 슬라이스를 Rust로 옮겨(`experiments/bff-rs/`) 두 언어의 타입 추론을
같은 도메인 위에서 비교한다. 결론부터: **"값에서 타입을 뽑아 계약을 한 곳에 두는" 추론은
TypeScript(valibot·tRPC)가 앞서고, "빠뜨림·null·미매핑을 컴파일 타임에 못박는" 추론은
Rust가 앞선다.** 항목별로 짚는다.

각 절은 실제 이 저장소의 코드를 인용한다 — TS는 `apps/bff`·`packages/shared`,
Rust는 `experiments/bff-rs`.

---

## 1. 스키마 → 타입 추론: valibot이 이긴다

TS는 valibot 스키마 **하나**에서 런타임 검증기와 정적 타입을 동시에 얻는다. 계약이
값(스키마)에 있고 타입은 거기서 파생된다 — 단일 진실 소스.

```ts
// packages/shared/src/task.ts
export const taskSchema = v.object({
  id: v.string(),
  durationMin: v.pipe(v.number(), v.integer(), v.minValue(1)),
  status: taskStatusSchema,
  // ...
});
export type Task = v.InferOutput<typeof taskSchema>; // 값 → 타입
```

Rust엔 값에서 타입을 유도하는 장치가 없다. 방향이 반대다 — **타입을 먼저 선언**하고,
serde derive가 그 타입을 *읽어* 디코더 코드를 생성한다(타입을 만들어내진 않는다).

```rust
// experiments/bff-rs/src/contract.rs
#[derive(Serialize, Deserialize)]
#[serde(try_from = "String")]
pub struct IsoDate(String);           // 검증은 타입에 붙는다
impl TryFrom<String> for IsoDate { /* 'YYYY-MM-DD' 확인 */ }
```

차이의 실질:
- **TS**: `taskSchema` 한 줄을 고치면 `Task` 타입과 런타임 검증이 함께 바뀐다. 드리프트 0.
- **Rust**: 검증 규칙(`TryFrom`)과 타입(`struct`)이 별도라 손이 두 번 간다. 대신 검증이
  **타입에 응결**돼(`IsoDate`) 그 타입을 쓰는 모든 곳에 자동으로 따라붙는다 — valibot에선
  `pipe(string, isoDate)`를 쓰는 자리마다 스키마를 다시 조립해야 하는 걸, Rust는 `IsoDate`
  하나로 재사용한다. "parse, don't validate"가 타입 시스템에 박힌다.

> 요약: 계약을 **한 곳에** 두는 추론은 valibot 승. 검증을 **타입에** 결합해 재사용하는
> 추론은 Rust 승.

---

## 2. 구조적 vs 명목적 — 포트 주입

TS 인터페이스는 구조적이다. `TaskStore` 모양만 맞으면 무엇이든 주입된다 — 인메모리든
Kysely든 "맞다고 선언"할 필요가 없다.

```ts
// apps/bff/src/modules/task/ports.ts
export interface TaskStore { findById(input: TaskRefInput): Promise<Task | null>; /* ... */ }
// memory.ts: class InMemoryTaskStore implements TaskStore { ... }  ← implements는 선택적 확인용
```

Rust trait은 명목적이다 — `impl TaskStore for InMemoryTaskStore`를 **명시**해야 그 타입이
포트로 통한다. 라우터는 이를 제네릭 바운드로 받아 정적 디스패치(단형화)한다.

```rust
// experiments/bff-rs/src/router.rs
pub struct TaskRouter<'a, T: TaskStore, P: ProjectStore, S: SyncBroker> {
    pub tasks: &'a T, pub projects: &'a P, pub sync: &'a S,
}
```

추론 관점:
- **TS**: `createTaskRouter(deps)`에 아무 객체나 넘겨도 모양이 맞으면 통과. 유연하지만
  "이 객체가 스토어다"라는 의도가 타입에 안 드러난다(우연한 구조 일치도 통과).
- **Rust**: 어떤 타입이 포트인지 `impl`로 못박히고, 제네릭 `T`가 호출 지점에서 구체 타입으로
  단형화돼 가상 디스패치 비용이 없다. `dyn TaskStore`로 바꾸면 TS의 동적 주입과 같은
  런타임 다형성도 선택할 수 있다 — **정적/동적을 타입으로 고른다.**

---

## 3. Exhaustiveness — `as const satisfies` vs `match`

도메인 에러를 전송 코드로 매핑하는 자리. TS는 `satisfies Record<DomainErrorCode, ...>`로
"모든 코드가 매핑됐나"를 컴파일 타임에 확인한다 — 이 프로젝트가 이미 쓰는 기법이다.

```ts
// apps/bff/src/trpc/init.ts
const TRPC_CODE_BY_DOMAIN_CODE = {
  [DOMAIN_ERROR_CODES.EMAIL_TAKEN]: 'CONFLICT',
  // ...
} as const satisfies Record<DomainErrorCode, TRPCError['code']>;
```

Rust는 같은 보장을 `match`가 **언어 기본으로** 준다. 변형을 빠뜨리면 컴파일이 안 된다.

```rust
// experiments/bff-rs/src/errors.rs
pub fn transport_code(self) -> TransportCode {
    match self {
        DomainError::EmailTaken => TransportCode::Conflict,
        DomainError::InvalidCredentials => TransportCode::Unauthorized,
        // 하나라도 빠지면 E0004: non-exhaustive patterns
    }
}
```

차이:
- 둘 다 전수성을 컴파일 타임에 잡는다. **TS는 `satisfies`를 기억해서 써야** 얻고(안 쓰면
  침묵), **Rust는 `match`면 공짜**다(비전수 매치는 에러가 기본).
- 매핑 *값*까지 검사하는 건 TS `satisfies`가 더 세밀하다(`Record`의 값 타입 `TRPCError['code']`
  위반도 잡음). Rust는 반환 타입 `TransportCode`가 그 역할을 하되, "코드 문자열 리터럴
  집합"처럼 값-수준 제약은 enum으로 승격해야 표현된다.

---

## 4. 3-상태 patch — `optional(nullable)` vs `Option<Option<T>>`

의도 기반 부분 업데이트의 `projectId`는 **세 상태**다: 부재(안 바꿈)/`null`(프로젝트에서
뗌)/문자열(붙임). TS는 한 줄로 표현하지만 세 상태가 타입에 다 안 드러난다.

```ts
// packages/shared/src/task.ts
projectId: v.optional(v.nullable(v.string())),  // 타입: projectId?: string | null
```

`string | null`에서 "부재"와 "`null`"은 둘 다 값이 없는 상태로 뭉개진다 — 라우터는
`typeof input.patch.projectId === 'string'`으로 *간접* 판별한다(=`Some(Some)`일 때만).

Rust는 세 상태를 타입에 **직접** 싣는다. 대신 serde 기본이 `null`과 부재를 못 가르므로
`double_option` 헬퍼가 필요하다.

```rust
// experiments/bff-rs/src/contract.rs
#[serde(default, deserialize_with = "double_option")]
pub project_id: Option<Option<String>>,   // None=부재, Some(None)=뗌, Some(Some)=붙임
```
```rust
// router.rs — 세 상태가 패턴으로 그대로 갈린다
if let Some(Some(project_id)) = &input.patch.project_id { /* 존재 검증 */ }
```

- **TS**: 선언은 짧지만 세 번째 상태(부재 vs null)가 타입에서 사라져 런타임 `typeof`·`in`
  체크로 복원한다.
- **Rust**: 선언은 길고 serde 보일러플레이트(`double_option`)가 붙지만, 세 상태가 타입에
  살아 있어 `match`/`if let`이 컴파일 타임에 전수 검사된다. 실수로 "뗌"을 빠뜨리면 드러난다.

이 프로젝트의 patch 시맨틱(필드 단위 LWW)에선 이 3-상태 구분이 정확성의 핵심이라, Rust가
**의도를 타입으로 못박는** 이점이 크다.

---

## 5. `null`/`undefined`의 부재 — `Option<T>`

TS 포트는 `Promise<Task | null>`을 반환하고, 코드베이스 전체가 `?? null`·`!= null`·옵셔널
체이닝으로 없음을 다룬다. 또 `undefined`와 `null`이 **둘 다** 존재해 미묘한 이중성이 있다
(`countById.get(project.id)`는 `undefined`, DB 없음은 `null`).

```ts
// task/router.ts
const count = countById.get(project.id);
return { ...project, totalCount: count?.total ?? 0, doneCount: count?.done ?? 0 };
```

Rust엔 `null`도 `undefined`도 없다. 없음은 오직 `Option<T>`이고, 컴파일러가 "없을 수 있는
값을 없음 처리 없이 쓰는 것"을 막는다.

```rust
// router.rs
let (total, done) = count_by_id.get(project.id.as_str()).copied().unwrap_or((0, 0));
```

- **TS**: `Task | null`을 그냥 `.title` 접근하면 `strictNullChecks`가 잡아준다 — 좋다. 다만
  `null` vs `undefined` 이중성, `?.`/`??` 표기의 산발이 남는다.
- **Rust**: 없음 채널이 하나(`Option`)라 `find_by_id → Option<Task>`가 `?`나 `.ok_or(...)`로
  균일하게 흐른다. `Option`을 안 풀면 타입이 안 맞아 **까먹을 수가 없다.**

---

## 6. 에러 전파 — throw+미들웨어 추론 vs `Result`+`?`

TS 도메인 계층은 `throw new DomainError(...)`로 제어를 튕기고, tRPC 미들웨어가 잡아
전송 에러로 바꾼다. 던지는 값은 타입에 안 실린다(`throw`는 시그니처에 안 나타남).

```ts
// task/router.ts
if (!task) throw new DomainError(DOMAIN_ERROR_CODES.TASK_NOT_FOUND);
```

Rust는 에러를 **반환 타입**에 실어(`Result<T, DomainError>`) `?`로 전파한다. 어떤 함수가
어떤 에러를 낼 수 있는지가 시그니처에 드러난다.

```rust
// router.rs
let task = self.tasks.find_by_id(&ctx.user_id, &input.id).ok_or(DomainError::TaskNotFound)?;
```

- **TS**: 리졸버가 깔끔하고(그냥 던짐), 매핑을 미들웨어 한 곳(`domainErrorMapper`)에 모은다.
  단 함수 시그니처만 봐선 무슨 에러가 나는지 알 수 없다(추론이 실패 채널을 안 실음).
- **Rust**: 실패가 타입에 실려 호출자가 반드시 다뤄야 한다(`Result`를 무시하면 경고). 대신
  전송 매핑을 미들웨어처럼 한 곳에 얹는 대신 경계에서 `transport_code()`로 명시 변환한다.

---

## 7. 엔드투엔드 추론 — tRPC가 압도적으로 이긴다

이건 TS의 최대 강점이자 Rust에 **대응물이 없는** 항목이다. tRPC는 서버 라우터의 타입을
그대로 클라이언트가 추론한다 — 스키마·핸들러 반환 타입이 네트워크를 건너 프론트까지
흐른다.

```ts
// apps/bff/src/trpc/router.ts
export type AppRouter = ReturnType<typeof createAppRouter>; // 라우터 형태 전체가 타입 하나로
// 웹: trpc.task.range.useQuery(...) 의 입력·출력이 서버에서 자동 추론됨 (코드 생성 0)
```

`ReturnType<typeof createAppRouter>` 한 줄로 9개 프로시저의 입력/출력이 **값에서 타입으로**
승격돼 클라이언트 훅까지 전파된다. Rust엔 이런 "함수 반환값의 구조를 타입으로 캡처"가
없다 — 크레이트 경계를 넘는 계약은 손으로 타입을 공유하거나(우리처럼 `contract.rs`),
codegen(예: OpenAPI/`ts-rs`)으로 만들어야 한다.

> 요약: **웹↔BFF 계약 자동 전파는 TS/tRPC의 결정적 우위.** Rust 단독으론 재현 불가이며,
> 스키마 파일 공유 + 코드 생성으로 우회한다.

---

## 8. 지역 추론 — 무승부(성격이 다르다)

- **`Promise.all` 튜플 추론(TS)**: `const [a, b, c] = await Promise.all([...])`가 각 원소
  타입을 튜플로 보존한다. Rust엔 async join이 없어(동기 포팅) 순차 호출로 옮겼다 — 병렬
  튜플 추론은 TS가 매끄럽다.
- **이터레이터 체인(Rust)**: `changes`의 `max_seq` 계산에서 `iter().map().max()`의 원소
  타입이 클로저 인자까지 전부 추론된다. TS의 `Math.max(input.cursor, ...arr.map(c => c.syncSeq))`와
  대등하되, Rust는 빈 배열에서 `Option`을 강제해(`unwrap_or`) "빈 경우"를 타입으로 챙긴다
  (TS `Math.max()` = `-Infinity` 함정 없음).
- **클로저/제네릭 추론**: 둘 다 지역 클로저 인자·제네릭 인스턴스를 잘 추론한다. Rust는
  가끔 turbofish(`::<T>`)나 타입 주석이 필요하고, TS는 문맥 타입이 약하면 `any`로 샌다.

---

## 결론 표

| 항목 | 더 나은 쪽 | 이유 |
| --- | --- | --- |
| 스키마→타입 단일 소스 | **TypeScript** | valibot `InferOutput` — 값 하나에서 검증+타입 |
| 검증의 타입 결합·재사용 | **Rust** | 뉴타입(`IsoDate`)에 검증 응결, "parse don't validate" |
| 미매핑 방지(exhaustiveness) | **Rust** | `match` 비전수는 컴파일 에러(기본), TS는 `satisfies` 기억 필요 |
| 3-상태 patch 표현 | **Rust** | `Option<Option<T>>`로 부재/null/값이 타입에 살아있음 |
| null 안전 | **Rust**(근소) | `Option` 단일 채널, `undefined`/`null` 이중성 없음 |
| 에러가 시그니처에 드러남 | **Rust** | `Result<_, DomainError>` vs 안 보이는 `throw` |
| 에러 매핑 한 곳 집중 | **TypeScript**(근소) | tRPC 미들웨어 한 지점 |
| 웹↔BFF 엔드투엔드 추론 | **TypeScript**(압도) | tRPC `AppRouter` 자동 전파, codegen 0 |
| 병렬(`Promise.all`) 추론 | **TypeScript** | async join 튜플 보존 |

**정리.** 이 BFF의 성격(웹과 계약을 공유하는 tRPC 게이트웨이)에선 TS의 엔드투엔드 추론이
아키텍처적 이점이라 Rust로 옮기면 그 자리를 codegen으로 메워야 한다. 반대로 도메인 로직의
**정확성**(에러 전수 매핑, 3-상태 patch, null 부재, 실패가 타입에 드러남)은 Rust의 추론이
더 촘촘히 못박는다. 요컨대 **계약 전파는 TS, 불변식 강제는 Rust**다.
