mod auth;
mod clock;
mod config;
mod db;
mod http;
mod metrics;
mod migrations;
mod retry;
mod scheduler;
mod sender;

use std::sync::Arc;

use anyhow::Context;
use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod};
use tokio::sync::watch;
use tokio_postgres::NoTls;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "tooday_push_server=info".into()),
        )
        .init();

    let cfg = config::Config::from_env()?;
    tracing::info!(
        timezone = %cfg.timezone,
        poll_interval = ?cfg.poll_interval,
        lookback_min = cfg.lookback_min,
        sender = ?cfg.sender,
        fanout = cfg.fanout_concurrency,
        max_attempts = cfg.max_attempts,
        subscriptions_api = cfg.jwt_secret.is_some(),
        "tooday-push-server 시작"
    );

    let pool = create_pool(&cfg.database_url, cfg.db_pool_size)?;
    // 자체 테이블은 부팅 시 스스로 마이그레이션한다 — BFF 스키마에 의존하지 않는다.
    migrations::apply(&pool).await?;

    let shared_metrics = Arc::new(metrics::Metrics::default());
    let (shutdown_tx, shutdown_rx) = watch::channel(false);

    // 운영 표면(healthz/readyz/metrics)은 항상 뜬다. 구독 API만 시크릿에 좌우된다.
    if cfg.jwt_secret.is_none() {
        tracing::warn!("PUSH_JWT_SECRET 미설정 — /subscriptions는 503 (스케줄러·운영 표면은 동작)");
    }
    let state = http::ApiState {
        pool: pool.clone(),
        jwt_secret: cfg.jwt_secret.clone().map(Arc::from),
        metrics: shared_metrics.clone(),
    };
    let http_addr = cfg.http_addr;
    let http_shutdown = shutdown_rx.clone();
    tokio::spawn(async move {
        if let Err(err) = http::serve(http_addr, state, http_shutdown).await {
            tracing::error!(error = format!("{err:#}"), "HTTP 서버 중단");
        }
    });

    let sender = sender::Sender::new(cfg.sender)?;
    let scheduler = scheduler::Scheduler::new(cfg, sender, pool, shared_metrics);
    let scheduler_handle = tokio::spawn(scheduler.run(shutdown_rx));

    tokio::signal::ctrl_c()
        .await
        .context("종료 신호 대기 실패")?;
    tracing::info!("종료 신호 수신 — 진행 중인 틱 완료 후 종료");
    let _ = shutdown_tx.send(true);
    let _ = scheduler_handle.await;
    Ok(())
}

fn create_pool(database_url: &str, pool_size: usize) -> anyhow::Result<Pool> {
    let pg_config: tokio_postgres::Config =
        database_url.parse().context("DATABASE_URL 해석 실패")?;
    let manager = Manager::from_config(
        pg_config,
        NoTls,
        ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        },
    );
    Ok(Pool::builder(manager).max_size(pool_size).build()?)
}
