# T005 — BFF user 모듈 수직 슬라이스 정상화

- 상태: 대기
- 생성: 2026-07-08
- 완료: -
- 커밋: -

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

## 완료 기준

- [ ] `modules/user/`가 포트·어댑터·라우터 코로케이션 구조를 갖춤
- [ ] auth 포트에서 user 조회 관심사가 분리됨
- [ ] lint:deps / typecheck / bff 테스트 통과

## 대화 기록

> **사용자**: 전체 디저인시스템의 아키텍처나 bff 설계 등등을 보고 체계적으로 잡힌게
> 아니라 예외적으로 만들어쟈있는부분을 찾아 개선하고싶음 먼저 찾아봐
>
> **Claude** (조사 보고 중): "BFF `user` 모듈이 실제 수직 슬라이스가 아니라 껍데기
> 라우터일 뿐이고 포트·어댑터(`UserStore`)가 `auth` 모듈 안에 있음. 결합이
> `trpc/context.ts`와 조립 루트를 경유해서 dependency-cruiser가 못 봄." (HIGH impact)
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
