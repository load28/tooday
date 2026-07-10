# T019 — BFF 운영 견고화 (config 검증·장애 가시성·배포 토폴로지)

- 상태: 대기
- 생성: 2026-07-10
- 완료: -
- 커밋: -

## 배경

기능 버그는 아니지만 운영 시 조용히 무너지는 지점들. 재조사(2026-07-10)에서 발견.

1. **config 무검증** — `apps/bff/src/platform/config.ts:40-55`.
   `port`/`accessTtlMs`/`refreshIdleTtlMs`/`pgPoolSize` 등이 `Number(env.X ?? 기본)`
   으로 파싱되어 `NaN`이 조용히 통과한다. `BFF_ACCESS_TTL_MS` 오타 하나로 모든
   JWT `exp`가 `NaN`이 된다. 검증되는 건 `BFF_JWT_SECRET`뿐. 코드베이스 전반이
   valibot 계약인데 config만 수제 파싱.
2. **세션 라이브니스 실패를 무음으로 삼킴** — `apps/bff/src/modules/auth/session-liveness.ts:23-27`.
   `catch { return null }` — fail-closed는 옳지만 Redis/DB 장애 시 전 유저가
   전 요청에서 로그아웃되는데 로그 한 줄 없다. 인증 핫패스 + SSE 가드에서 실행됨.
3. **쿠키 `SameSite=Lax` 고정** — `apps/bff/src/modules/auth/cookies.ts:4-8`.
   CORS는 `credentials: true`로 크로스 오리진을 설정할 수 있는데(`app.ts:41-48`)
   Lax 쿠키는 크로스 사이트 fetch에 실리지 않는다. web과 BFF가 다른 도메인이면
   쿠키 인증이 조용히 실패. SameSite 설정 노브 없음.
4. **idle 만료가 라이브니스에 반영 안 됨 (의도 결정 필요)** —
   `apps/bff/src/modules/auth/adapters/sql.ts:112-121`이 `absolute_expires_at`만
   확인. 회전은 거부되는 idle-dead 세션이 액세스 토큰 잔여 수명(15분) 동안 "live".
   Redis 어댑터도 같은 구조. 문서화(의도)든 포함(수정)이든 명시적으로 결정한다.
5. **소소 항목**
   - SSE write fire-and-forget — `apps/bff/src/app.ts:82-84`의
     `void stream.writeSSE(...)`는 rejection 미관찰. `.catch()` 또는
     `stream.aborted` 가드.
   - `pub.appConfig` 값 하드코딩 — `apps/bff/src/modules/pub/router.ts:6-15`.
     `minSupportedAppVersion` 같은 배포 시점 값은 `platform/config`(env)로.
   - 죽은 인덱스 `sessions_user_id` (refresh_tokens에 user_id 단독 조회 없음,
     `platform/db/migrations.ts:34`) — 새 마이그레이션으로 드롭.
   - `deleteExpired` 스윕의 `absolute_expires_at` 인덱스 부재
     (`modules/auth/adapters/sql.ts:123-132`) — 규모상 낮음, 위 마이그레이션에 편승.

## 작업 내용

- config를 valibot 스키마로 파싱: coerce + 범위 검증(양의 정수,
  `refreshIdleTtlMs <= refreshAbsoluteTtlMs`), 부팅 시 fail-fast.
- `verifyLiveSession`에 로거 주입, 실패 시 `session_liveness_check_failed` 에러
  로그 후 null 반환 (fail-closed 유지).
- SameSite를 config로 노출 (`Lax` 기본, 크로스 사이트 배포용 `None; Secure`).
- idle-라이브니스 의미를 결정하고 코드 또는 문서에 반영.
- 소소 항목 일괄 처리 (SSE catch, appConfig env화, 인덱스 마이그레이션).

## 완료 기준

- [ ] 잘못된 env로 부팅 시 즉시 명확한 에러로 실패한다 (테스트)
- [ ] 라이브니스 스토어 장애가 로그에 남는다 (테스트)
- [ ] SameSite가 설정 가능하다
- [ ] idle-라이브니스 결정이 코드/문서에 반영됨
- [ ] `bun run typecheck` / 기존 테스트 전체 통과

## 대화 기록

> **사용자**: 재조사를 하자 기존 14번 미처리로 결론을 내자
>
> **Claude** (BFF 조사 에이전트 보고 원문, 이 태스크 해당 부분):
>
> **M10** — `Number("abc")` yields `NaN` and is accepted silently. A malformed
> `BFF_ACCESS_TTL_MS` makes every JWT `exp` `NaN` [중략] Fix: parse config
> through a valibot schema (coerce + validate ranges), fail fast at boot.
>
> **M8** — Fail-closed is the right security choice, but the `catch {}`
> discards the error entirely. A Redis/DB outage here logs out every
> authenticated user on every request with zero diagnostics.
>
> **M7** — CORS is configured with `credentials: true` for configurable
> cross-origin origins, but `SameSite=Lax` cookies are not sent on cross-site
> XHR/fetch. [중략] There is no config knob for SameSite.
>
> **M6** — Session liveness only checks the absolute cap, not idle expiry.
> [중략] Decide intentionally: either document that idle only gates rotation,
> or include idle in liveness.
>
> **L9 / L11 / L12 / L13** [중략]

## 작업 로그

- (없음)
