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
   미삭제, 미발송인 태스크를 찾는다.
3. `task_push_sends`에 `INSERT … ON CONFLICT DO NOTHING`으로 발송을
   점유(claim)한다 — PK가 `(task_id, 예정 일시)`라 인스턴스가 몇 대여도 한 번만
   발송되고, 태스크 일정이 바뀌면 새 키가 되어 자연히 다시 알림된다.
4. 그 유저의 구독 토큰 전부로 발송. 전부 실패하면 점유를 되돌려 lookback 창
   안에서 다음 틱에 재시도한다.

발송기는 `PUSH_SENDER`로 고른다:

- `log` (기본) — 실제 발송 없이 내용을 로그로만. 개발·검증용.
- `expo` — [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/).
  `platform = 'expo'`인 토큰만 처리한다. FCM v1/APNs 직결은 후속.

## HTTP API (구독 등록/해제)

`PUSH_JWT_SECRET`가 설정된 경우에만 `PUSH_HTTP_ADDR`(기본 127.0.0.1:3003)에서 뜬다.
모든 쓰기는 `Authorization: Bearer <BFF 액세스 JWT>` 필수 — 서명·만료만 검증한다
(등록/해제는 저위험이고 액세스 TTL이 짧아 세션 라이브니스 체크는 생략).

```
GET    /healthz                          → 200 "ok"
POST   /subscriptions {token, platform}  → 204 (upsert; platform: expo|fcm|apns|webpush)
DELETE /subscriptions {token}            → 204 (본인 소유만 삭제)
```

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
