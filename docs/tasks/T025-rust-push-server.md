# T025 — Rust 푸시 서버 (태스크 시작 시간 알림)

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-10
- 완료: 2026-07-10
- 커밋: 0f0321d, 27e3645 (BFF 분리)

## 배경

태스크에는 시작 시간이 있지만(`tasks.date` 'YYYY-MM-DD' + `tasks.start_at` 'HH:mm',
`apps/bff/src/platform/db/schema.ts:43`) 그 시간이 됐을 때 사용자에게 알려주는
장치가 없다. 앱은 RN WebView 셸이므로 서버 발신 푸시가 필요하고, 이를 담당할
독립 서비스를 Rust로 만든다.

전제가 되는 시간 모델: `date`/`start_at`은 **시간대 없는 사용자 로컬 값**이다
(`packages/shared/src/task.ts:9`). 유저별 시간대 저장이 없으므로 푸시 서버가
설정된 단일 시간대(기본 `Asia/Seoul`)로 해석한다 — 유저별 시간대는 후속 과제.

## 작업 내용

### 1. DB 마이그레이션 0007 (BFF 소유 — 스키마 변경은 `platform/db/migrations.ts`로만)

- `push_subscriptions` — 유저별 푸시 대상 기기 토큰. `(token PK, user_id FK,
  platform CHECK in ('expo','fcm','apns','webpush'), created_at)`.
  등록 API는 후속 태스크(아래 「남긴 것」) — 지금은 테이블만.
- `task_push_sends` — 발송 dedup 로그. PK `(task_id, scheduled_date,
  scheduled_start_at)` — 태스크의 일정이 바뀌면 새 키가 되므로 자연히 재알림되고,
  같은 일정으로는 서버가 몇 대든 `INSERT … ON CONFLICT DO NOTHING`으로 한 번만
  발송을 점유(claim)한다.
- `apps/bff/src/platform/db/schema.ts`에 두 테이블 타입 추가 (BFF가 아직 안 쓰지만
  스키마 문서의 완결성 + 후속 등록 API의 자리).

### 2. `apps/push-server/` — Rust 스케줄러 데몬

- **루프**: `PUSH_POLL_INTERVAL_SECS`(기본 30초)마다 틱. crontab식 정확 발화 대신
  폴링을 택했다 — 태스크 편집·삭제가 수시로 일어나므로 "발화 시점에 DB를 다시 보는"
  폴링이 예약 큐 무효화 관리보다 단순하고 안전하다.
- **due 판정**: 설정 시간대의 현재 시각을 `'YYYY-MM-DD HH:mm'` 문자열로 만들어
  `date || ' ' || start_at`과 사전순 비교. `[now - PUSH_LOOKBACK_MIN, now]` 창에
  들고, `deleted_at IS NULL`, `status = 'todo'`(이미 시작/완료한 태스크는 시작
  알림이 무의미), 아직 `task_push_sends`에 없는 행만.
- **claim → send**: dedup 로그 INSERT로 점유한 뒤 그 유저의 구독 토큰 전부로 발송.
  전부 실패하면 claim을 지워 다음 틱에 재시도(lookback 창 안에서만).
- **발송기 플러그블** (`PUSH_SENDER`): `log`(기본 — 발송 내용을 로그로만, 개발·검증용),
  `expo`(Expo Push API — RN 표준 경로, 인증정보 불필요). FCM v1/APNs 직결은 후속.
- **스택**: tokio + tokio-postgres(연결 끊기면 다음 틱에 재접속) + chrono-tz +
  reqwest(rustls). uuid 크레이트 의존을 피하려고 SQL에서 `id::text` 캐스트.

### 기각한 대안

- **BFF(Node) 안에 스케줄러 내장**: 요청 스코프 프로세스에 상주 루프를 섞으면
  스케일아웃 시 중복 발송 제어가 BFF 전체에 번진다. 별도 프로세스 + DB claim이
  경계가 깨끗하고, 사용자가 Rust로 만들기를 원했다.
- **Postgres LISTEN/NOTIFY 또는 예약 큐**: "미래 시각 발화"는 어차피 타이머가
  필요하고, 편집·삭제 무효화까지 얹으면 복잡도만 커진다. 30초 폴링이면 충분.

### 남긴 것 (후속 태스크 후보)

- ~~BFF에 구독 등록/해제 tRPC 라우트~~ → 방향 수정으로 push-server 자체 API로 이관 (아래).
- RN 셸에서 push-server API로 토큰 전달 배선.
- 유저별 시간대 컬럼과 due 판정 반영.
- FCM HTTP v1 / APNs 직결 발송기.

### 방향 수정 (2026-07-10) — BFF와 완전 분리

사용자 지시로 푸시 서버를 BFF에서 완전히 독립시켰다. DB는 공유하되 **스키마
소유를 분리**한다:

- BFF 마이그레이션 0007과 `schema.ts`의 푸시 테이블 타입을 **제거** — BFF는
  푸시의 존재를 모른다.
- 푸시 테이블은 push-server가 부팅 시 자체 버전드 마이그레이션
  (`src/migrations.rs`, 이력 테이블 `push_server_migrations`,
  `pg_advisory_lock`으로 다중 인스턴스 동시 부팅 안전)으로 만든다.
  BFF 테이블에 FK를 걸지 않는다 — 서비스 간 DDL 의존(부팅 순서·이름 변경
  파급)을 없애기 위해서다. 고아 행은 무해하다(dedup 로그 + due 조인으로
  선택 안 됨).
- 구독 등록/해제도 BFF가 아니라 push-server 내장 HTTP API(axum, 기본
  127.0.0.1:3003)가 받는다. 인증은 BFF 발급 액세스 JWT(HS256, `sub`=userId)를
  시크릿 공유(`PUSH_JWT_SECRET`=`BFF_JWT_SECRET`)로 직접 검증 — BFF와 달리
  세션 라이브니스 체크는 생략(저위험 쓰기 + 액세스 TTL 15분에 폐기 지연이
  갇힌다).
  - `POST /subscriptions {token, platform}` upsert / `DELETE /subscriptions
    {token}` 본인 소유만 / `GET /healthz`.
- 커넥션은 수동 재접속 대신 deadpool-postgres 풀로 전환 (스케줄러·API 공용).

## 완료 기준

- [x] 마이그레이션 0007이 PGlite·Postgres 양쪽에서 적용된다 (bff 테스트 통과)
- [x] `cargo build` + `cargo test` 통과 (due 창 계산·자정 경계·메시지 조립 단위 테스트)
- [x] 실제 Postgres(docker)에서 E2E: 마이그레이션 적용 → 유저·태스크·구독 삽입 →
      push-server가 due 태스크를 감지해 log 발송 + `task_push_sends` 기록,
      재실행 시 중복 발송 없음
- [x] `bun run typecheck` 통과 (bff 스키마 변경분)

## 대화 기록

> **사용자**: 러스트로 푸시서버 만들고싶음 특정타임이 되면 푸시를 보내는거지 태스크 시작시간되면
>
> **Claude**: 러스트 푸시 서버 작업이군요. CLAUDE.md 규칙대로 먼저 README와 태스크
> 문서 규칙을 읽고, 태스크 파일부터 만든 뒤 구현하겠습니다. [코드베이스 조사 후]
> 설계 방향: `apps/push-server/`(Rust/tokio 폴링 데몬), DB 마이그레이션 0007로
> `push_subscriptions`·`task_push_sends` 추가, 시간대 없는 `date`+`start_at`은
> 설정 타임존(기본 Asia/Seoul)으로 해석, 발송기는 플러그블(log/expo).
> [구현·검증 완료 후 요약 보고 — 마이그레이션은 BFF 체계(0007)에 추가했고
> 구독 등록 API는 BFF tRPC 라우트로 후속 제안]

> **사용자**: bff말고 푸시서버기 뱔도로있어야함
>
> **Claude**: BFF와의 접점을 걷어내고 푸시서버를 완전히 독립시키라는 말씀이군요.
> 지금도 별도 프로세스이긴 한데, 테이블 DDL을 BFF 마이그레이션에 넣어둔 게
> 결합점입니다. 그걸 푸시서버 소유로 옮기고(자체 마이그레이션, BFF 테이블에 FK
> 없음), 구독 등록 API도 BFF가 아니라 푸시서버 자체에 얹겠습니다(BFF 액세스
> JWT를 시크릿 공유로 검증). → 「방향 수정 (2026-07-10)」 반영.

## 작업 로그

- 2026-07-10: 태스크 생성, 설계 확정. 구현 착수.
- 2026-07-10: 구현 완료 + 검증.
  - 마이그레이션 0007(`push_subscriptions`, `task_push_sends`) + `schema.ts` 타입,
    `apps/push-server/`(config/clock/db/sender/scheduler) 작성.
  - 검증: `cargo test` 4건(시간대 변환·자정 경계·사전순 비교·메시지 조립) 통과,
    `cargo clippy` 경고 0, `bun test src`(bff) 95 pass — PGlite에서 0007 적용 확인,
    `bun run typecheck`·`bun run check` 통과 (biome이 Rust `target/`을 훑지 않게
    ignore 추가).
  - E2E(docker Postgres): 0007 적용 → 유저 1 + 태스크 3(due todo / lookback 밖 /
    due done) + 토큰 2 삽입 → due todo 1건만 감지·2개 토큰 발송·`task_push_sends`
    기록, 같은 프로세스 다음 틱과 프로세스 재시작 후 모두 재발송 없음,
    `start_at` 변경 시 새 키로 재알림(로그·행 확인).
  - 발견·수정: tokio-postgres에서 `$1::uuid` 캐스트는 파라미터 타입을 uuid로
    추론시켜 String 직렬화가 실패한다 — `($1::text)::uuid`로 우회.
- 2026-07-10: 방향 수정 — BFF와 완전 분리 (위 「방향 수정」 참고).
  - BFF 되돌림: 마이그레이션 0007 제거, `schema.ts` 푸시 테이블 타입 제거.
  - push-server에 추가: `migrations.rs`(자체 버전드 마이그레이션 + advisory
    lock), `auth.rs`(JWT 검증), `http.rs`(axum 구독 API),
    deadpool-postgres 풀 전환.
  - 검증: `cargo test` 8건(기존 4 + JWT 4: 유효/만료/오서명/sub 없음) 통과,
    clippy 0, bff `bun test` 95 pass(0007 제거 후에도 정상), typecheck·biome 통과.
  - E2E(docker Postgres 리셋 후): BFF 마이그레이션 0006까지만 적용 →
    push-server 부팅이 `0001_init` 자체 적용(`push_server_migrations` 확인) →
    HTTP API: 무인증 401 / 잘못된 platform 400 / 등록·해제 204 (hono/jwt로
    서명한 실제 형식의 액세스 JWT 사용) → 일정 갱신 시 등록된 토큰으로만
    발송(해제한 fcm 토큰 제외, sent=1/targets=1), 중복 발송 없음.
