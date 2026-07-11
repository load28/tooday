# tooday-push-server

태스크 시작 시간(`tasks.date` + `tasks.start_at`)이 되면 그 유저의 구독 기기
(`push_subscriptions`)로 푸시를 보내는 **BFF와 독립인** Rust 서버. 설계 배경과
결정은 [docs/tasks/T025-rust-push-server.md](../../docs/tasks/T025-rust-push-server.md).

## BFF와의 경계

DB(PostgreSQL)는 공유하지만 스키마 소유는 분리한다:

- 푸시 테이블(`push_subscriptions`, `task_push_sends`, `push_server_migrations`)은
  **이 서버가 부팅 시 자체 마이그레이션**(`src/migrations.rs`)으로 만든다.
  BFF 테이블에 FK도 걸지 않는다 — 서비스 간 DDL 의존(부팅 순서·이름 변경 파급)을
  만들지 않기 위해서다.
- BFF 테이블(`tasks`, `users`)은 **읽기만** 한다.
- 구독 등록/해제도 BFF를 거치지 않는다 — 이 서버의 HTTP API가 받는다.
  인증은 BFF가 발급한 액세스 JWT(HS256, `sub`=userId)를 시크릿 공유
  (`PUSH_JWT_SECRET` = BFF의 `BFF_JWT_SECRET`)로 직접 검증한다.

## 동작 원리 (스케줄러)

1. `PUSH_POLL_INTERVAL_SECS`(기본 30초)마다 틱.
2. 설정 시간대(`PUSH_TIMEZONE`, 기본 Asia/Seoul)의 현재 시각으로 due 창
   `[now - PUSH_LOOKBACK_MIN, now]`을 `'YYYY-MM-DD HH:mm'` 문자열로 만들어
   `date || ' ' || start_at`과 사전순 비교 — 창 안이면서 `status = 'todo'`,
   미삭제, 발송 레코드가 없는 태스크를 찾는다.
3. `task_push_sends`에 `pending` + lease로 점유(claim, `INSERT … ON CONFLICT
   DO NOTHING`) — PK가 `(task_id, 예정 일시)`라 인스턴스가 몇 대여도 한 번만
   점유되고, 태스크 일정이 바뀌면 새 키가 되어 자연히 다시 알림된다.
4. due 태스크들을 동시 팬아웃(`PUSH_FANOUT_CONCURRENCY`)으로 발송하고 상태를
   확정한다: 성공 → `sent`, 전 토큰 실패 → 지수 백오프로 재시도 예약
   (`PUSH_MAX_ATTEMPTS` 도달 시 `failed`로 포기).

### 전달 보장 (at-least-once)

- **크래시 복구**: 점유 직후 프로세스가 죽어도 lease(`PUSH_LEASE_SECS`)가
  만료되면 아무 인스턴스나 그 발송을 이어받는다 (`FOR UPDATE SKIP LOCKED` —
  복구 경쟁도 안전). 재시도 백오프도 같은 lease 메커니즘으로 도래한다.
- **무효화**: 복구 시점에 태스크가 삭제·완료·일정변경돼 있으면 발송을
  포기(`failed`)한다 — 일정변경이면 새 키로 다시 점유되므로 유실이 아니다.
- **죽은 토큰 정리**: 발급자가 무효 판정한 토큰(Expo `DeviceNotRegistered`)은
  즉시 `push_subscriptions`에서 삭제된다.

발송기는 `PUSH_SENDER`로 고른다:

- `log` (기본) — 실제 발송 없이 내용을 로그로만. 개발·검증용.
- `expo` — [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/)
  (요청당 100건 배치). `platform = 'expo'`인 토큰만 처리한다.
  FCM v1/APNs 직결은 후속.

## HTTP 표면

`PUSH_HTTP_ADDR`(기본 127.0.0.1:3003)에서 항상 뜬다. 구독 쓰기만
`Authorization: Bearer <BFF 액세스 JWT>` 필수 — 서명·만료만 검증한다
(등록/해제는 저위험이고 액세스 TTL이 짧아 세션 라이브니스 체크는 생략).

```
GET    /healthz                          → 200 (liveness)
GET    /readyz                           → 200 | 503 (DB ping — readinessProbe 자리)
GET    /metrics                          → Prometheus 텍스트 (발송/실패/복구/포기/죽은토큰/틱 지표)
POST   /subscriptions {token, platform}  → 204 (upsert; platform: expo|fcm|apns|webpush)
DELETE /subscriptions {token}            → 204 (본인 소유만 삭제)
```

`PUSH_JWT_SECRET` 미설정이면 `/subscriptions`만 503 — 운영 표면과 스케줄러는 그대로 돈다.

## 배포

멀티스테이지 `Dockerfile` 포함 (release 빌드 → debian-slim, non-root):

```bash
docker build -t tooday-push-server apps/push-server
docker run -e DATABASE_URL=... -e PUSH_JWT_SECRET=... -p 3003:3003 tooday-push-server
```

우아한 종료: SIGINT를 받으면 진행 중인 틱을 끝까지 완료하고 내려간다 —
중간에 끊겨도 lease 복구가 이어받으므로 어느 쪽이든 유실은 없다.

## 실행

```bash
# 저장소 루트에서 Postgres 기동 (PGlite는 프로세스 밖 접속 불가 — 실제 Postgres 필요)
bun run infra:up

cd apps/push-server
cp .env.example .env   # DATABASE_URL / PUSH_JWT_SECRET 확인
cargo run
```

## 테스트

```bash
cargo test    # due 창(시간대·자정 경계)·메시지 조립·JWT 검증 단위 테스트
cargo clippy --all-targets
```
