# T026 — 푸시 서버 엔터프라이즈 준비 (신뢰성·관측성·운영)

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-11
- 완료: 2026-07-11
- 커밋: c8a077b

## 배경

T025로 만든 푸시 서버는 개인 앱 규모 기준의 MVP다. 사용자가 엔터프라이즈
준비상태를 원한다. 현재 구조의 한계:

- **claim-then-send의 크래시 창**: `task_push_sends`에 점유(INSERT)한 직후
  프로세스가 죽으면 그 알림은 영영 발송되지 않는다 (`apps/push-server/src/scheduler.rs`
  의 claim → send 사이). 발송 실패 시 점유를 지워 재시도하는 경로도 "삭제 후
  재-claim"이라 두 인스턴스가 경합하면 중복 발송 여지가 있다.
- **발송이 순차**: 틱 안에서 태스크를 하나씩 처리 — due가 몰리면 지연.
- **죽은 토큰 방치**: 앱 삭제로 무효해진 토큰(Expo `DeviceNotRegistered`)을
  계속 보낸다.
- **관측성 부재**: 로그뿐 — 발송량/실패율/틱 지연을 수치로 볼 수 없다.
- **종료가 비우아**: ctrl-c가 진행 중인 틱을 끊는다.
- **구독 API와 헬스가 결합**: `PUSH_JWT_SECRET` 없으면 `/healthz`조차 안 뜬다.

## 작업 내용

### 1. 전달 신뢰성 — outbox식 상태 머신 (마이그레이션 0002)

`task_push_sends`를 "발송 완료 로그"에서 "전달 상태 머신"으로 승격:

- `status` `pending|sent|failed` (기존 행은 `sent`로 백필), `attempts`,
  `lease_until`(처리 임차), `sent_at` nullable.
- claim = `status='pending'` + lease로 INSERT (ON CONFLICT DO NOTHING —
  다중 인스턴스 1회 점유는 유지).
- 성공 → `sent`. 일시 실패 → `attempts+1` + 지수 백오프(`retry_base × 2^n`,
  상한 15분)로 lease 갱신, `attempts ≥ max`(기본 5)면 `failed`.
- **크래시 복구**: lease가 만료된 `pending` 행을 매 틱 `FOR UPDATE SKIP
  LOCKED`로 집어 재발송. 태스크가 그새 삭제/완료/일정변경됐으면 `failed`
  (abandoned) — 새 일정은 새 키로 다시 claim되므로 유실 없음.
- 구독 토큰이 0개인 태스크도 `sent` 처리 (처리 완료의 의미).

### 2. 죽은 토큰 정리

발송기가 건수 대신 토큰별 결과(`Sent|DeadToken|Failed`)를 돌려주고,
스케줄러가 `DeadToken`(Expo `DeviceNotRegistered`)을 `push_subscriptions`에서
즉시 삭제한다.

### 3. 동시 팬아웃

틱 안에서 due 태스크를 `buffer_unordered`(기본 16, `PUSH_FANOUT_CONCURRENCY`)로
동시 처리. DB 풀 크기도 설정화(`PUSH_DB_POOL_SIZE`, 기본 8).

### 4. 관측성 + HTTP 표면 정리

- HTTP 서버를 항상 띄운다: `/healthz`(liveness), `/readyz`(DB ping),
  `/metrics`(Prometheus 텍스트 — 발송/실패/죽은토큰/복구/틱 카운터와 지연).
- `/subscriptions`만 JWT 필수 — `PUSH_JWT_SECRET` 미설정이면 503.

### 5. 우아한 종료

watch 채널로 종료 신호 전파 — 진행 중인 틱은 끝까지 완료 후 종료,
axum은 graceful shutdown.

### 6. 배포 아티팩트

멀티스테이지 Dockerfile (release 빌드 → slim 런타임).

### 기각/보류

- **FCM v1·APNs 직결 발송기**: 서비스 계정/인증서 없이는 검증 불가 — 후속.
- **DB TLS(rustls)**: 매니지드 Postgres용 — 후속.
- **큐(MQ) 도입**: 이 규모 로드맵에서는 Postgres outbox가 더 단순하고 충분.
  수백만 팬아웃이 실제로 오면 그때 검토.

## 완료 기준

- [x] `cargo test` (백오프·Expo 티켓 결과 매핑 단위 테스트 추가) + clippy 통과
- [x] E2E(docker Postgres): 정상 발송 → `sent`; pending+만료 lease 강제 후
      복구 재발송; 태스크 무효화 후 복구가 `failed`(abandoned) 처리;
      `/metrics`·`/readyz` 응답 확인
- [x] 마이그레이션 0002가 기존 0001 DB 위에 적용된다
- [x] `bun run typecheck`·`check` 영향 없음 (Rust만 변경)

## 대화 기록

> **사용자**: [푸시 구조 문답 — FCM/APNs 게이트웨이, 토큰 등록의 의미, 발송
> 경로에 대한 설명 대화. 중략]
>
> **사용자**: 그럼 모든 푸시서버는 결국 fcm과 통신하는거구나 fcm없이 구현이
> 불가능하네? 그럼 푸시서버의 성능이 필요하다는건 fcm으로 던지는것자체가
> 성능적인게 필요한거임?
>
> **Claude**: [발송 성능은 팬아웃 처리량·대상 조회·피드백 루프(죽은 토큰
> 정리)에 있고, 현재 규모에서는 문제가 아니라는 설명. 중략]
>
> **사용자**: 난 엔터프라이즈 준비상태로 맘들고싶은데?
>
> **Claude**: 엔터프라이즈 준비상태로 해석한 범위를 구현: 전달 신뢰성(outbox
> 상태 머신 + lease 복구 + 지수 백오프), 죽은 토큰 자동 정리, 동시 팬아웃,
> 관측성(/metrics·/readyz), 우아한 종료, Dockerfile. FCM 직결·DB TLS는
> 자격증명 필요로 후속.

## 작업 로그

- 2026-07-11: 태스크 생성, 범위 확정. 구현 착수.
- 2026-07-11: 구현 완료 + 검증.
  - 마이그레이션 0002(status/attempts/lease_until + pending 부분 인덱스),
    `retry.rs`(지수 백오프), `metrics.rs`(Prometheus 카운터),
    scheduler 재작성(동시 팬아웃 + deliver/recover 공용 경로),
    sender 토큰별 결과(`Sent|DeadToken|Failed`) + Expo 100건 배치,
    http에 `/readyz`·`/metrics` 추가(운영 표면 상시, 구독 API만 시크릿 게이트),
    watch 채널 우아한 종료, Dockerfile.
  - 검증: `cargo test` 12건(백오프 2·티켓 매핑 2 추가) 통과, clippy 0,
    biome·typecheck 영향 없음.
  - E2E(docker Postgres, 기존 0001 DB 위): 0002 적용 확인 → due 발송 →
    `sent`(sent_at 기록) → 행을 pending+만료 lease로 강제 → 복구 경로가
    재발송(`미완 발송 복구 재시도` 로그, 다시 `sent`) → 태스크를 done으로
    무효화 후 재강제 → `failed` 폐기(`무효해진 발송 폐기` 로그) →
    `/metrics` 카운터 정합(claims 1, sent 2, recoveries 2, abandoned 1,
    tick_errors 0), `/readyz` 200, 구독 등록 204, SIGINT 우아한 종료 확인.
  - Dockerfile 검증: 이미지 빌드 후 컨테이너 스모크 테스트(healthz ok,
    readyz 200, 스케줄러 기동). 단 이 샌드박스는 egress가 프록시 강제라
    빌드 시 프록시 CA 주입(검증 전용, 커밋본에는 없음)이 필요했다 —
    일반 CI/로컬에서는 커밋된 Dockerfile 그대로 빌드된다.
