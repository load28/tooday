use std::sync::atomic::Ordering::Relaxed;
use std::sync::Arc;

use chrono::Utc;
use deadpool_postgres::Pool;
use futures::stream::StreamExt;
use tokio::sync::watch;
use tokio_postgres::Client;

use crate::config::Config;
use crate::metrics::Metrics;
use crate::sender::{build_messages, SendStatus, Sender};
use crate::{clock, db, retry};

/// 폴링 스케줄러 — 틱마다 due 태스크를 점유(claim)해 발송하고, lease가 만료된
/// 미완 발송을 복구한다.
///
/// crontab식 예약 발화 대신 폴링인 이유: 태스크 편집·삭제가 수시로 일어나므로
/// "발화 시점에 DB를 다시 보는" 쪽이 예약 큐 무효화 관리보다 단순하고 안전하다.
pub struct Scheduler {
    cfg: Config,
    sender: Sender,
    pool: Pool,
    metrics: Arc<Metrics>,
}

/// 복구는 틱당 이만큼만 — 밀린 발송이 산더미여도 틱이 무한정 길어지지 않는다.
/// 남은 것은 다음 틱이 이어받는다.
const RECOVERY_BATCH: i64 = 100;

impl Scheduler {
    pub fn new(cfg: Config, sender: Sender, pool: Pool, metrics: Arc<Metrics>) -> Self {
        Self {
            cfg,
            sender,
            pool,
            metrics,
        }
    }

    pub async fn run(self, mut shutdown: watch::Receiver<bool>) {
        let mut interval = tokio::time::interval(self.cfg.poll_interval);
        // 틱이 밀려도 몰아서 실행하지 않는다 — due 판정은 매 틱 현재 시각 기준이라 손실이 없다.
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        loop {
            // 종료 신호는 틱 사이에서만 관찰한다 — 진행 중인 틱은 끝까지 완료된다.
            tokio::select! {
                _ = interval.tick() => {}
                _ = shutdown.changed() => {
                    tracing::info!("종료 신호 — 스케줄러 중단");
                    return;
                }
            }
            let started = std::time::Instant::now();
            self.metrics.ticks_total.fetch_add(1, Relaxed);
            if let Err(err) = self.tick().await {
                self.metrics.tick_errors_total.fetch_add(1, Relaxed);
                tracing::error!(error = format!("{err:#}"), "틱 실패 — 다음 틱에 재시도");
            }
            self.metrics
                .last_tick_ms
                .store(started.elapsed().as_millis() as u64, Relaxed);
        }
    }

    async fn tick(&self) -> anyhow::Result<()> {
        let (from, to) = clock::due_window(Utc::now(), self.cfg.timezone, self.cfg.lookback_min);
        let due = {
            let client = self.pool.get().await?;
            db::fetch_due_tasks(&client, &from, &to).await?
        };
        if !due.is_empty() {
            tracing::info!(count = due.len(), %from, %to, "due 태스크 감지");
        }

        // 동시 팬아웃 — 태스크별로 풀에서 커넥션을 얻어 독립 처리한다.
        // 개별 실패는 로그만 남긴다: 해당 발송은 pending+lease 상태라 복구가 이어받는다.
        let jobs: Vec<_> = due.iter().map(|task| self.process_due(task)).collect();
        let mut fanout = futures::stream::iter(jobs).buffer_unordered(self.cfg.fanout_concurrency);
        while let Some(result) = fanout.next().await {
            if let Err(err) = result {
                tracing::error!(
                    error = format!("{err:#}"),
                    "발송 처리 실패 — 복구 경로가 이어받는다"
                );
            }
        }
        drop(fanout);

        self.recover().await
    }

    async fn process_due(&self, task: &db::DueTask) -> anyhow::Result<()> {
        let client = self.pool.get().await?;
        if !db::claim_send(&client, task, self.cfg.lease_secs as f64).await? {
            return Ok(()); // 다른 인스턴스가 점유
        }
        self.metrics.claims_total.fetch_add(1, Relaxed);
        self.deliver(&client, task, 0).await
    }

    /// 점유된 발송의 실제 전달과 상태 확정 — due 최초 시도와 복구 재시도가 공유한다.
    async fn deliver(
        &self,
        client: &Client,
        task: &db::DueTask,
        attempts: i32,
    ) -> anyhow::Result<()> {
        let targets = db::fetch_targets(client, &task.user_id).await?;
        if targets.is_empty() {
            // 보낼 곳이 없으면 처리 완료 — 나중에 구독해도 지난 알림은 소급하지 않는다.
            db::mark_sent(client, task).await?;
            tracing::info!(task_id = %task.id, "구독 토큰 없음 — 발송 없이 처리 완료");
            return Ok(());
        }

        let outcomes = self.sender.send(&build_messages(task, &targets)).await;
        let mut sent = 0usize;
        let mut dead = 0usize;
        for outcome in &outcomes {
            match outcome.status {
                SendStatus::Sent => sent += 1,
                SendStatus::DeadToken => {
                    db::delete_dead_token(client, &outcome.token).await?;
                    self.metrics.dead_tokens_total.fetch_add(1, Relaxed);
                    tracing::info!(token = %outcome.token, "무효 토큰 정리");
                    dead += 1;
                }
                SendStatus::Failed => {}
            }
        }
        self.metrics.sent_total.fetch_add(sent as u64, Relaxed);

        // 하나라도 전달됐거나, 실패가 전부 죽은 토큰(재시도 무의미)이면 완료.
        if sent > 0 || sent + dead == outcomes.len() {
            db::mark_sent(client, task).await?;
            tracing::info!(task_id = %task.id, sent, targets = targets.len(), "발송 완료");
            return Ok(());
        }

        let backoff = retry::backoff_secs(self.cfg.retry_base_secs, attempts);
        let abandoned =
            db::mark_attempt_failed(client, task, self.cfg.max_attempts, backoff as f64).await?;
        if abandoned {
            self.metrics.abandoned_total.fetch_add(1, Relaxed);
            tracing::warn!(task_id = %task.id, attempts = attempts + 1, "재시도 상한 초과 — 발송 포기");
        } else {
            self.metrics.retry_scheduled_total.fetch_add(1, Relaxed);
            tracing::warn!(task_id = %task.id, attempts = attempts + 1, backoff_secs = backoff, "전 토큰 발송 실패 — 재시도 예약");
        }
        Ok(())
    }

    /// lease가 만료된 pending 발송을 이어받는다 — 죽은 인스턴스의 점유분과
    /// 백오프가 도래한 재시도가 모두 이 경로로 온다.
    async fn recover(&self) -> anyhow::Result<()> {
        let client = self.pool.get().await?;
        let picked =
            db::pick_recoverable(&client, self.cfg.lease_secs as f64, RECOVERY_BATCH).await?;
        for item in &picked {
            self.metrics.recoveries_total.fetch_add(1, Relaxed);
            if !item.still_valid {
                // 태스크가 그새 삭제·완료·일정변경됨 — 이 발송은 무의미하다.
                // (일정변경이면 새 키로 다시 claim되므로 유실이 아니다.)
                db::mark_abandoned(&client, &item.task).await?;
                self.metrics.abandoned_total.fetch_add(1, Relaxed);
                tracing::info!(task_id = %item.task.id, "무효해진 발송 폐기");
                continue;
            }
            tracing::info!(task_id = %item.task.id, attempts = item.attempts, "미완 발송 복구 재시도");
            self.deliver(&client, &item.task, item.attempts).await?;
        }
        Ok(())
    }
}
