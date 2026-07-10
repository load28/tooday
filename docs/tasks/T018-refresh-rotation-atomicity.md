# T018 — 리프레시 토큰 회전 원자성

- 상태: 대기
- 생성: 2026-07-10
- 완료: -
- 커밋: -

## 배경

리프레시 토큰의 핵심 보장 — 단일 사용(single-use) 회전 + 재사용 탐지 — 이 두
어댑터 모두에서 동시 요청에 깨진다. 재사용 체크가 트랜잭션/원자 연산 밖의 읽기라,
같은 유효 토큰으로 동시에 회전을 요청하면 둘 다 체크를 통과해 **한 세션에 살아있는
리프레시 토큰이 2개** 생기고 재사용 탐지도 발화하지 않는다.

1. **SQL** — `apps/bff/src/modules/auth/adapters/sql.ts:62-101`

   `superseded_at IS NULL` 확인이 트랜잭션 이전의 별도 SELECT이고, 트랜잭션 안의
   `UPDATE ... SET superseded_at = now`에는 `superseded_at IS NULL` 가드가 없다.

2. **Redis** — `apps/bff/src/modules/auth/adapters/redis.ts:56-82`

   GET → 검사 → SET(superseded=true) → 새 토큰 write. 전형적인 비원자
   read-modify-write.

## 작업 내용

- SQL: supersede를 원자화 — 트랜잭션 안에서
  `UPDATE ... SET superseded_at = now WHERE token_hash = ? AND superseded_at IS NULL`
  후 `numUpdatedRows === 1` 확인. 0이면 다른 회전이 이겼다는 뜻 → 재사용으로
  간주(세션 폐기) 또는 중단.
- Redis: Lua 스크립트(CAS on superseded 플래그) 또는 `WATCH`/`MULTI`로
  supersede+발급을 원자화.
- 동시성 테스트: 같은 토큰으로 `rotate`를 병렬 2회 호출해 정확히 1개만 성공하고
  세션 상태가 설계대로임을 두 어댑터 모두에서 검증한다. 기존
  `refresh-token-store.test.ts`는 백엔드 선택만 검증하므로 여기서 보강.

## 완료 기준

- [ ] SQL 어댑터: 가드된 UPDATE + 갱신 행 수 확인으로 원자 회전
- [ ] Redis 어댑터: Lua/CAS로 원자 회전
- [ ] 동시 회전 테스트(두 어댑터)가 단일 사용 보장을 잠근다
- [ ] `bun run typecheck` / 기존 테스트 전체 통과

## 대화 기록

> **사용자**: 재조사를 하자 기존 14번 미처리로 결론을 내자
>
> **Claude** (BFF 조사 에이전트 보고 원문, 이 태스크 해당 부분):
>
> **M3 — Refresh-token rotation is not atomic (SQL): reuse check is outside the
> transaction** [중략] Two concurrent rotations of the same valid token both
> pass the check, both enter their transactions, both mark superseded and both
> insert a fresh token → **two live refresh tokens for one session, and the
> reuse is never detected**. This defeats the single-use rotation and
> reuse-detection guarantee that the whole design rests on.
>
> **M4 — Refresh-token rotation is not atomic (Redis): GET-then-SET race**
> [중략] Fix: a Lua script (CAS on the superseded flag) or `WATCH`/`MULTI`, so
> the supersede-and-issue is atomic.

## 작업 로그

- (없음)
