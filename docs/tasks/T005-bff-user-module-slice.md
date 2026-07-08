# T005 — BFF user 모듈 수직 슬라이스 정상화

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-08
- 커밋: (후속 docs 커밋에서 기입)

## 배경

`apps/bff/src/modules/user/`에는 `router.ts` 하나뿐 — README의 "도메인 수직
슬라이스는 포트·어댑터·라우터를 코로케이션한다" 모델에서 벗어난다.

- user 도메인의 영속 포트 `UserStore`가 `apps/bff/src/modules/auth/ports.ts:9`에,
  어댑터 `SqlUserStore`가 `apps/bff/src/modules/auth/adapters/sql.ts`에 있다.
- `modules/user/router.ts`는 `ctx.loadUser()`를 통해 auth 소유 포트를 쓰고,
  `index.ts`가 `SqlUserStore`를 auth에서 import 해 조립한다.
- `verifyCredentials`·`create`(auth 관심사)와 `findById`(user 관심사)가 한
  인터페이스에 혼재 — users 테이블 소유권이 사실상 auth에 있다.
- 결합이 조립 루트(`trpc/context.ts`, `index.ts`)를 경유해 dependency-cruiser의
  `bff-no-cross-module` 규칙에는 안 걸리는, 구조적으로만 보이는 케이스.

## 작업 내용

`UserStore`를 관심사별로 분리해 user 모듈에 포트·어댑터를 코로케이션한다.
예: user 모듈이 조회 포트(`findById` 등)를 소유하고, auth는 자격 증명·생성
관심사만 갖는다. 조립 루트에서 두 포트에 같은 SQL 어댑터 구현을 물릴지,
어댑터도 분리할지는 착수 시 결정.

### 착수 시 결정 (기술 조사 기반)

헥사고날 원전(Cockburn "포트는 목적 있는 대화")·Hombergs ISP 포트 분리·DDD
(Vernon의 Identity & Access 컨텍스트 분리)·모듈러 모놀리스(단일 작성자 원칙)
문헌 조사 결과로 결정 — 대화 기록의 조사 보고서 참고:

1. **포트 분리** — auth: `UserStore`(create·verifyCredentials), user: `UserReader`(findById).
2. **어댑터도 모듈별 분리 코로케이션** — 어댑터 하나가 포트 여럿을 구현하는 것
   자체는 헥사고날에서 허용이지만(Hombergs buckpal 실증), 실증 사례는 전부 같은
   모듈 안의 포트들. 모듈 경계를 넘겨 공유하면 코로케이션이 어댑터 층에서 재발.
   단순 SELECT의 중복은 공유 추상화보다 낫다(VSA: "잘못된 추상화보다 중복이 싸다").
3. **단일 작성자 원칙** — users 테이블 쓰기는 auth만, user 모듈 어댑터는 읽기 전용.

## 완료 기준

- [x] `modules/user/`가 포트·어댑터·라우터 코로케이션 구조를 갖춤
- [x] auth 포트에서 user 조회 관심사가 분리됨
- [x] lint:deps / typecheck / bff 테스트 통과

## 대화 기록

> **사용자**: 전체 디저인시스템의 아키텍처나 bff 설계 등등을 보고 체계적으로 잡힌게
> 아니라 예외적으로 만들어쟈있는부분을 찾아 개선하고싶음 먼저 찾아봐
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> **2. BFF `user` 모듈이 수직 슬라이스가 아님 — 포트·어댑터가 `auth` 안에 있음**
> - `modules/user/`에는 `router.ts` 하나뿐. `UserStore` 포트는 `modules/auth/ports.ts:9`,
>   `SqlUserStore` 어댑터는 `modules/auth/adapters/sql.ts`에 있어서 users 테이블의
>   소유권이 auth에 있습니다. `verifyCredentials`(auth 관심사)와 `findById`(user
>   관심사)가 한 인터페이스에 섞여 있고, 결합이 `trpc/context.ts`와 조립 루트를
>   경유해서 dependency-cruiser가 못 봅니다.
>
> (BFF 조사 에이전트 보고 원문, HIGH impact 판정):
>
> **1. `user` is not a real vertical slice — its port + adapter live inside `auth`.**
> `apps/bff/src/modules/user/` contains **only `router.ts`** — no `ports.ts`, no
> `adapters/`. [...] The user domain's persistence port `UserStore` is defined in
> `modules/auth/ports.ts:9`, and its adapter `SqlUserStore` in
> `modules/auth/adapters/sql.ts:9`. [...] Net effect: the `users` table and all user
> persistence are **owned by the `auth` module**; `user` is a thin router stub reusing
> it. The auth/user boundary is blurred (`UserStore.create`/`verifyCredentials` are
> auth concerns; `findById` is a user concern — all blended in one auth-owned
> interface). The dep-cruiser can't see this because the coupling is laundered through
> `trpc/context.ts` + the composition root.
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

(2026-07-08, 태스크 착수 대화)

> **사용자**: 다음 내용 알려줘
>
> **Claude**: 다음 태스크는 **T005 — BFF user 모듈 수직 슬라이스 정상화**
> (우선순위: 높음)입니다. [중략 — 문제 요약] **작업 내용** (태스크 문서에 정해진
> 방향): 1. `UserStore`를 관심사별로 분리 — user 모듈이 조회 포트(`findById` 등)를
> 소유하고, auth는 자격 증명 검증·계정 생성 관심사만 갖도록. 2. `modules/user/`에
> 포트·어댑터를 코로케이션해서 정상적인 수직 슬라이스로 만들기. 3. 착수 시 결정할
> 사항이 하나 있음: 조립 루트에서 **두 포트에 같은 SQL 어댑터 구현 하나를 물릴지,
> 어댑터도 둘로 분리할지**. [중략]
>
> **사용자**: 1,2번은 맞는거같은데 3번은 기술조사스킬을 통해 헥사고날에서 어떻게
> 접근해야하는지 알려줘
>
> **Claude** (4각도 병렬 리서치 — 헥사고날 원전 / DDD / 모듈러 모놀리스 / 수직
> 슬라이스 — 후 종합 보고서, 결론 요약 원문):
>
> **포트는 모듈별로 분리하고, 어댑터도 각 모듈에 분리 코로케이션하는 것이 문헌상
> 정석에 가장 부합합니다.** 단, 조건이 하나 붙습니다: **users 테이블의 쓰기는 auth
> 모듈만** 하고(단일 작성자), user 모듈의 어댑터는 **읽기 전용**이어야 합니다.
> "어댑터 하나를 두 포트에 공유"는 헥사고날 자체로는 금지가 아니지만, 그 사례는
> 전부 *같은 모듈 안*의 포트들이었고, 모듈 경계를 넘겨 공유하면 T005가 고치려는
> 문제(코로케이션 붕괴)가 어댑터 층에서 재발합니다.
>
> [중략 — 근거: Cockburn "A port identifies a purposeful conversation" /
> Hombergs ISP 포트 분리·buckpal의 어댑터 1개-포트 2개 실증 / Vernon IDDD의
> Identity & Access 컨텍스트 분리(User → Author/Moderator 번역) / Evans Shared
> Kernel의 DB 설계 공유 경고 / 모듈러 모놀리스 "one writer per dataset" /
> VSA "슬라이스는 저장소를 공유할 수 있다", "잘못된 추상화보다 중복이 싸다"]
>
> **사용자**: 진행

## 작업 로그

- 2026-07-08 — user 모듈 수직 슬라이스 정상화 (포트 분리 + 어댑터 분리 + 단일 작성자):
  - 신규 `modules/user/ports.ts` — `UserReader`(findById, 읽기 전용) 포트.
    users 테이블 소유·쓰기는 auth라고 주석에 명시.
  - 신규 `modules/user/adapters/sql.ts` — `SqlUserReader` (읽기 전용 SELECT).
  - `modules/user/router.ts` — `createUserRouter({ users: UserReader })` 팩토리로
    전환(다른 모듈 라우터와 동형). `ctx.loadUser()` 대신 자기 포트로 조회.
  - `modules/auth/ports.ts` — `UserStore`에서 `findById` 제거(단일 작성자 주석 추가),
    `SqlUserStore.findById` 삭제. `InMemoryUserStore.findById`는 포트 밖 메서드로
    유지 — 테스트 조립 루트가 구조적 타이핑으로 UserReader에도 물린다(같은 가짜
    테이블, SQL 세계와 동형).
  - `trpc/context.ts` — `loadUser`·`users` 의존 제거(컨텍스트는 인증 핫패스만).
    `trpc/router.ts`·`app.ts`·`index.ts`에 `userReader` 의존 배선.
  - 테스트: auth 어댑터 테스트에서 findById 케이스 분리, 신규
    `modules/user/adapters/adapters.test.ts`(SqlUserReader, 시드 직접 삽입) 추가.
  - 검증: typecheck 4/4, lint:deps 위반 0, bff 테스트 95 pass / 0 fail
    (신규 테스트 +1, 6 skip은 기존 환경 동작), Biome 통과.
