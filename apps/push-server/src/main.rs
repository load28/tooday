mod clock;
mod config;
mod db;
mod scheduler;
mod sender;

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
        "tooday-push-server 시작"
    );

    let sender = sender::Sender::new(cfg.sender)?;
    let scheduler = scheduler::Scheduler::new(cfg, sender);

    tokio::select! {
        _ = scheduler.run() => {}
        _ = tokio::signal::ctrl_c() => {
            tracing::info!("종료 신호 수신 — 중단");
        }
    }
    Ok(())
}
