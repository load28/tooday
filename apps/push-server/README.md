# tooday-push-server

태스크 시작 시간(`tasks.date` + `tasks.start_at`)이 되면 그 유저의 구독 기기
(`push_subscriptions`)로 푸시를 보내는 Rust 스케줄러 데몬. 설계 배경과 결정은
[docs/tasks/T025-rust-push-server.md](../../docs/tasks/T025-rust-push-server.md).

## 동작 원리

1. `PUSH_POLL_INTERVAL_SECS`(기본 30초)마다 틱.
2. 설정 시간대(`PUSH_TIMEZONE`, 기본 Asia/Seoul)의 현재 시각으로 due 창
   `[now - PUSH_LOOKBACK_MIN, now]`을 `'YYYY-MM-DD HH:mm'` 문자열로 만들어
   `date || ' ' || start_at`과 사전순 비교 — 창 안이면서 `status = 'todo'`,
   미삭제, 미발송인 태스크를 찾는다.
3. `task_push_sends`에 `INSERT … ON CONFLICT DO NOTHING`으로 발송을
   점유(claim)한다 — PK가 `(task_id, 예정 일시)`라 인스턴스가 몇 대여도 한 번만
   발송되고, 태스크 일정이 바뀌면 새 키가 되어 자연히 다시 알림된다.
4. 그 유저의 `push_subscriptions` 토큰 전부로 발송. 전부 실패하면 점유를 되돌려
   lookback 창 안에서 다음 틱에 재시도한다.

발송기는 `PUSH_SENDER`로 고른다:

- `log` (기본) — 실제 발송 없이 내용을 로그로만. 개발·검증용.
- `expo` — [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/).
  `platform = 'expo'`인 토큰만 처리한다. FCM v1/APNs 직결은 후속.

## 실행

```bash
# 저장소 루트에서 Postgres 기동 + 마이그레이션은 BFF가 부팅 시 적용
bun run infra:up

cd apps/push-server
cp .env.example .env   # DATABASE_URL 확인
cargo run
```

테이블(`push_subscriptions`, `task_push_sends`)은 BFF의 버전드 마이그레이션
0007(`apps/bff/src/platform/db/migrations.ts`)이 만든다 — 스키마 변경은 반드시
거기서만 한다. 구독 등록 API는 아직 없으므로 지금은 SQL로 직접 넣는다:

```sql
insert into push_subscriptions (token, user_id, platform)
values ('ExponentPushToken[xxxx]', '<user uuid>', 'expo');
```

## 테스트

```bash
cargo test    # due 창 계산(시간대·자정 경계)·메시지 조립 단위 테스트
cargo build
```
