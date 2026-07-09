# T010 — BFF 잔여 정리 (pub 계약·config·SSE 401·sync 위치)

- 상태: 완료
- 생성: 2026-07-08
- 완료: 2026-07-09
- 커밋: 3980805

## 배경

BFF 조사에서 나온 중간 임팩트 예외들:

1. **pub 라우터만 shared 계약 없음** — `apps/bff/src/modules/pub/router.ts:5-12`가
   인라인 객체 리터럴(`version: '0.0.0'` 하드코딩)을 반환. 다른 모든 프로시저는
   `packages/shared` valibot 스키마에서 입출력을 파생한다. 또한 `trpc/cache.ts`가
   `pubRouter`의 프로시저 shape에 컴파일 타임 의존(`CacheablePath` 파생) — 접착
   층이 특정 도메인 모듈에 결합된 비자명한 링크.
2. **config 우회** — `apps/bff/src/app.ts:34`가 `process.env.NODE_ENV !== 'test'`를
   직접 읽음. `platform/config.ts`가 단일 config 표면인데 `isTest`/`logRequests`
   플래그가 없어 우회함 (프로덕션 경로 유일한 누수).
3. **SSE 401 메시지 중복** — `modules/auth/middleware.ts:29`가 `'UNAUTHENTICATED'`
   코드와 `'인증이 필요합니다.'` 메시지를 하드코딩 — `platform/errors.ts:3,14`의
   `DOMAIN_ERROR_CODES/MESSAGES`와 중복 (인증 로직 자체는 공유하고 있음, 문자열만 중복).
4. **task 전용 인프라가 platform에** — `platform/db/sync.ts`(withUserSyncSeq,
   task 어댑터만 사용)와 `platform/sync-broker.ts`(포트+어댑터가 platform에 있는
   유일한 쌍). 형태는 제네릭하나 사실상 task 동기화 인프라.

## 작업 내용

1. `packages/shared`에 pub 응답 스키마 추가, 라우터가 파생 타입 사용.
2. `platform/config.ts`에 플래그 추가, `app.ts`의 process.env 직접 읽기 제거.
3. SSE 401이 `platform/errors.ts` 상수를 재사용.
4. sync 인프라는 task 모듈로 옮기거나, platform에 남길 명분(도메인 무관 신호 채널)을
   해당 파일 주석 + 문서로 명시 — 착수 시 결정.

## 완료 기준

- [ ] 인라인 응답 리터럴·process.env 직접 읽기·에러 문자열 중복 0건
- [ ] sync 인프라 위치가 결정되고 근거가 기록됨
- [ ] lint:deps / typecheck / bff 테스트 통과

## 대화 기록

> **사용자**: 전체 디저인시스템의 아키텍처나 bff 설계 등등을 보고 체계적으로 잡힌게
> 아니라 예외적으로 만들어쟈있는부분을 찾아 개선하고싶음 먼저 찾아봐
>
> **Claude** (종합 조사 보고 중, 이 태스크 해당 부분 원문):
>
> **8. BFF 잔여 예외들**
> - `pub` 라우터만 shared valibot 계약 없이 인라인 리터럴 반환(`version: '0.0.0'`
>   하드코딩), `trpc/cache.ts`가 `pubRouter` 타입에 결합.
> - `app.ts:34`가 `platform/config.ts`를 우회해 `process.env.NODE_ENV` 직접 읽음
>   (프로덕션 경로에서 유일한 누수).
> - SSE 401이 `platform/errors.ts`의 `UNAUTHENTICATED` 코드·메시지를 `middleware.ts:29`에
>   하드코딩으로 중복.
> - `platform/db/sync.ts`·`sync-broker.ts`는 task 전용인데 platform에 주차됨 (경계는
>   통과하지만 "도메인 무관" 명분이 약함).
>
> **사용자**: 나머지해야하는 작업을 태스크로 문서로 기록하자

## 작업 로그

- (없음)
