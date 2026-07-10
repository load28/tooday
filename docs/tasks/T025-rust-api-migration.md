# T025 — BFF 내부 동작을 러스트 API(apps/api)로 일괄 분리

- 상태: 완료
- 생성: 2026-07-10
- 완료: 2026-07-10
- 커밋: -

## 배경

BFF(apps/bff)는 현재 조립(tRPC 계약·쿠키·캐시 정책·SSE)과 내부 동작(인증 토큰
발급·회전, 비밀번호 해싱, DB 접근, sync seq 발급, 정렬 키 생성)을 모두 들고 있다.
사용자 지시로 내부 동작 전체를 러스트 API 서비스로 한 번에 분리한다 —
**BFF는 조립만, 실제 내부 동작은 러스트 API**.

근거 코드(마이그레이션 전):

- 인증 내부 동작: `apps/bff/src/modules/auth/adapters/sql.ts`(argon2 해싱·리프레시
  회전·재사용 탐지), `adapters/redis.ts`, `access-token.ts`(HS256 JWT),
  `refresh-token.ts`(토큰 생성·SHA-256 해시), `refresh-token-sweeper.ts`
- 데이터 내부 동작: `apps/bff/src/modules/task/adapters/sql.ts`,
  `modules/user/adapters/sql.ts`
- DB 설비: `apps/bff/src/platform/db/*`(Kysely·PGlite·Postgres·마이그레이션),
  `platform/db/sync.ts`(유저별 advisory lock + sync seq 발급),
  `platform/ordering.ts`(fractional index)

## 작업 내용

### 새 서비스 — apps/api (Rust: axum + sqlx + PostgreSQL)

BFF 포트(계약)를 1:1로 비추는 내부 HTTP API (기본 포트 3003, JSON camelCase,
에러는 `{error: {code, message}}` + HTTP 상태). `INTERNAL_API_TOKEN` 설정 시
Bearer 검증(BFF ↔ API 내부 신뢰 경계).

- **auth** — `POST /internal/auth/signup | login | refresh | logout | verify`.
  argon2id 해싱(기존 Bun.password 해시와 PHC 포맷 호환), HS256 액세스
  JWT(`sub`/`sid`/`exp` — 기존과 동일 클레임), 리프레시 토큰(32바이트 hex,
  SHA-256 해시 저장), 회전(idle 슬라이딩 + absolute 캡 + 재사용 탐지 시 세션
  일괄 무효화), verify = JWT 검증 + 세션 라이브니스 단일 호출(fail-closed).
  저장소는 SQL(기본) / Redis(`REDIS_URL` opt-in) 이중 백엔드 유지. SQL 백엔드는
  만료 토큰 스윕 태스크 내장.
- **task/project** — `/internal/users/{userId}/tasks*`, `/projects*`,
  `/task-changes`, `/project-changes`, `/task-counts`, `/sync-cursor`.
  유저별 advisory lock(`pg_advisory_xact_lock(hashtext(userId))`) + sync seq
  발급·필드 단위 LWW 부분 업데이트·tombstone 소프트 삭제 — SQL 의미 동일 이관.
- **user** — `GET /internal/users/{id}`.
- **정렬 키** — fractional-indexing(npm) 알고리즘을 러스트로 포팅, JS 구현과
  출력 동일성(패리티 벡터) 테스트.
- **마이그레이션** — sqlx 내장 마이그레이터. 베이스라인은 기존 Kysely 마이그레이션
  0001~0006의 최종 스키마를 `IF NOT EXISTS`로 재현해 기존 DB·신규 DB 모두 안전.
- ID는 UUIDv7 유지.

### BFF — 조립층으로 축소

- auth 포트를 흐름 단위 게이트웨이(`AuthGateway`: signup/login/refresh/logout/
  verifyAccessToken)로 재정의하고 HTTP 어댑터로 구현. task/user 포트는 표면
  유지, 어댑터만 SQL → HTTP 교체.
- 삭제: `platform/db/*`, SQL·Redis 어댑터, 리프레시 저장소 선택기·스위퍼,
  세션 라이브니스(→ API verify로 통합). kysely/pglite/pg 의존성 제거.
- 유지: tRPC 계약·에러 매핑·쿠키 직렬화·CORS·캐시 정책·SSE 신호 채널
  (`sync.notify`는 뮤테이션 후 BFF가 쏨 — 신호는 힌트, 커서가 진실이므로 의미 불변),
  인메모리 어댑터(테스트 전용, JWT 서명 포함 — app.test.ts가 조립 계약을 그대로 검증).
- 설정: DB·Redis·JWT 관련 env 제거, `API_URL`/`API_INTERNAL_TOKEN` 추가.
  쿠키 TTL(maxAge)용 액세스/절대 TTL 설정은 표현 관심사로 BFF에 남는다.

### 기각한 대안

- **포트 전부 1:1 유지(리프레시 저장소 포트까지 HTTP화)**: 토큰 발급 정책
  (액세스+리프레시 결합)이 BFF에 남아 "내부 동작은 러스트"에 어긋나고, 요청당
  JWT 검증·라이브니스 2회 왕복이 생긴다 → auth만 흐름 단위 게이트웨이로 재단.
- **러스트가 SSE까지 소유 + BFF 릴레이**: 신호 채널은 클라이언트 전송 관심사이고
  현재 브로커는 단일 인스턴스 인메모리라 의미 이득 없이 기계만 늘어난다 → BFF 유지.
- **PGlite 임베디드 유지**: 러스트에서 불가. 개발도 docker Postgres
  (`bun run infra:up`)를 쓴다 — DX 후퇴는 러스트 분리의 본질 비용으로 수용.

## 완료 기준

- [x] apps/api가 cargo build/test 통과 (정렬 키 JS 패리티·JWT·해시 호환 단위 테스트 포함)
- [x] BFF: `bun run typecheck`·`bun test`(인메모리 조립 테스트) 통과, kysely/pglite/pg 의존 제거
- [x] `bun run lint:deps`·`bun run check` 통과
- [x] E2E: 로컬 Postgres에 API+BFF를 띄워 signup→login→task CRUD→델타 동기화→refresh 회전
      →재사용 탐지→logout 시나리오를 curl로 검증 (기존 Bun 발급 argon2 해시 검증 호환 포함)
- [x] README·.env.example·docker-compose 주석·docs/authentication-architecture.md 갱신

## 대화 기록

> **사용자**: 지금 bff에 구현된 로직들을 러스트로 api뷰뷴만 따로 분리해서 구현하고싶어 한번에 마이그레이션하고싶음. bff는 조립하는거고 실제 냐부동작은 러스트 api
>
> **Claude**: BFF 전체(모듈·플랫폼·계약)를 정독하고 다음 설계로 일괄 마이그레이션을 진행. (1) 신규 `apps/api` — Rust(axum+sqlx+PostgreSQL)로 인증(argon2·HS256 JWT·리프레시 회전·재사용 탐지·SQL/Redis 저장소)·태스크/프로젝트(sync seq·LWW 패치·tombstone)·유저 조회·fractional 정렬 키를 이관. (2) `apps/bff`는 tRPC 계약·쿠키·캐시·SSE 조립만 남기고 어댑터를 HTTP(러스트 API 호출)로 교체, DB·Redis 의존성 제거. auth 포트는 흐름 단위 AuthGateway로 재단(요청당 인증 왕복 1회). SSE 신호는 BFF가 뮤테이션 후 발화하는 현 구조 유지(신호는 힌트, 커서가 진실).

## 작업 로그

- 2026-07-10: apps/api(Rust: axum+sqlx) 신설 — config/error/ids/ordering(fractional-indexing
  JS 패리티 테스트)/auth(argon2id·HS256 JWT·리프레시 회전·재사용 탐지·SQL/Redis 저장소·
  만료 스윕)/task·project(advisory lock sync seq·LWW patch·tombstone)/user, sqlx 베이스라인
  마이그레이션(기존 Kysely 0001~0006 최종 스키마를 IF NOT EXISTS로 재현, 인덱스는 기존 DB
  실명 유지). BFF를 조립층으로 축소 — auth 포트를 AuthGateway로 재단(HTTP 어댑터 +
  테스트용 인메모리 게이트웨이), task/user 포트는 유지하고 어댑터만 SQL→HTTP 교체,
  platform/db·redis·스위퍼·session-liveness 삭제, config를 API_URL/INTERNAL_API_TOKEN
  기반으로 교체, kysely/pglite/pg 의존 제거. 검증: cargo test 11건(hono/jwt 토큰·Bun
  argon2 해시·sha256 픽스처 호환 포함), bun test 67건, typecheck/lint:deps/check 통과,
  로컬 Postgres E2E 20개 시나리오(signup 중복 409, 이중 인증, LWW patch·projectId
  tri-state, 빈 patch 400, 진행률 집계, tombstone 델타, 커서, 회전, 재사용 탐지 시 세션
  전체 즉시 무효화, 쿠키 발급·삭제, SSE 401/신호, 레거시 Bun 해시 로그인, 내부 토큰 경계)
  전부 통과.
