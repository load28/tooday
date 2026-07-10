use chrono::Utc;
use deadpool_postgres::Pool;

use crate::config::Config;
use crate::sender::{build_messages, Sender};
use crate::{clock, db};

/// 폴링 스케줄러 — 틱마다 due 태스크를 조회해 점유(claim) 후 발송한다.
///
/// crontab식 예약 발화 대신 폴링인 이유: 태스크 편집·삭제가 수시로 일어나므로
/// "발화 시점에 DB를 다시 보는" 쪽이 예약 큐 무효화 관리보다 단순하고 안전하다.
pub struct Scheduler {
    cfg: Config,
    sender: Sender,
    pool: Pool,
}

impl Scheduler {
    pub fn new(cfg: Config, sender: Sender, pool: Pool) -> Self {
        Self { cfg, sender, pool }
    }

    pub async fn run(self) {
        let mut interval = tokio::time::interval(self.cfg.poll_interval);
        // 틱이 밀려도 몰아서 실행하지 않는다 — due 판정은 매 틱 현재 시각 기준이라 손실이 없다.
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        loop {
            interval.tick().await;
            if let Err(err) = self.tick().await {
                // 접속 실패 포함 — 풀이 다음 틱에 새 커넥션을 만든다.
                tracing::error!(error = format!("{err:#}"), "틱 실패 — 다음 틱에 재시도");
            }
        }
    }

    async fn tick(&self) -> anyhow::Result<()> {
        let client = self.pool.get().await?;

        let (from, to) = clock::due_window(Utc::now(), self.cfg.timezone, self.cfg.lookback_min);
        let due = db::fetch_due_tasks(&client, &from, &to).await?;
        if due.is_empty() {
            tracing::debug!(%from, %to, "due 태스크 없음");
            return Ok(());
        }
        tracing::info!(count = due.len(), %from, %to, "due 태스크 감지");

        for task in &due {
            if !db::claim_send(&client, task).await? {
                continue; // 다른 인스턴스가 점유
            }
            let targets = db::fetch_targets(&client, &task.user_id).await?;
            if targets.is_empty() {
                tracing::info!(task_id = %task.id, "구독 토큰 없음 — 발송 없이 처리 완료");
                continue;
            }
            let sent = self.sender.send(&build_messages(task, &targets)).await;
            if sent == 0 {
                // 전부 실패 — 점유를 되돌려 lookback 창 안에서 다음 틱에 재시도한다.
                db::release_claim(&client, task).await?;
                tracing::warn!(task_id = %task.id, "전 토큰 발송 실패 — 점유 해제");
            } else {
                tracing::info!(task_id = %task.id, sent, targets = targets.len(), "발송 완료");
            }
        }
        Ok(())
    }
}
