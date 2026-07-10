mod auth;
mod clock;
mod config;
mod db;
mod http;
mod migrations;
mod scheduler;
mod sender;

use anyhow::Context;
use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod};
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
        http_api = cfg.jwt_secret.is_some(),
        "tooday-push-server 시작"
    );

    let pool = create_pool(&cfg.database_url)?;
    // 자체 테이블은 부팅 시 스스로 마이그레이션한다 — BFF 스키마에 의존하지 않는다.
    migrations::apply(&pool).await?;

    if let Some(secret) = cfg.jwt_secret.clone() {
        let state = http::ApiState {
            pool: pool.clone(),
            jwt_secret: secret.into(),
        };
        let addr = cfg.http_addr;
        tokio::spawn(async move {
            if let Err(err) = http::serve(addr, state).await {
                tracing::error!(error = format!("{err:#}"), "구독 등록 HTTP API 중단");
            }
        });
    } else {
        tracing::warn!("PUSH_JWT_SECRET 미설정 — 구독 등록 HTTP API 비활성 (스케줄러만 동작)");
    }

    let sender = sender::Sender::new(cfg.sender)?;
    let scheduler = scheduler::Scheduler::new(cfg, sender, pool);

    tokio::select! {
        _ = scheduler.run() => {}
        _ = tokio::signal::ctrl_c() => {
            tracing::info!("종료 신호 수신 — 중단");
        }
    }
    Ok(())
}

fn create_pool(database_url: &str) -> anyhow::Result<Pool> {
    let pg_config: tokio_postgres::Config =
        database_url.parse().context("DATABASE_URL 해석 실패")?;
    let manager = Manager::from_config(
        pg_config,
        NoTls,
        ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        },
    );
    // 스케줄러 1 + HTTP 핸들러 몇 개면 충분한 규모 — 커넥션을 아낀다.
    Ok(Pool::builder(manager).max_size(4).build()?)
}
