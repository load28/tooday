//! 컴포지션 루트 — TS `apps/bff/src/index.ts` 대응.
//!
//! 설정을 읽고 어댑터를 골라 앱에 물린 뒤 서버를 띄운다. 선택 규칙은 각 모듈이
//! 소유하고(예: 리프레시 저장소 백엔드), 여기서는 조립만 한다.

use std::sync::Arc;

use tooday_bff::app::{create_app, AppDeps};
use tooday_bff::modules::auth::access_token::AccessTokenService;
use tooday_bff::modules::auth::adapters::memory::InMemoryUserStore;
use tooday_bff::modules::auth::adapters::sql::SqlUserStore;
use tooday_bff::modules::auth::ports::{RefreshTokenStore, UserStore};
use tooday_bff::modules::auth::refresh_token_store::create_refresh_token_store;
use tooday_bff::modules::auth::refresh_token_sweeper::start_refresh_token_sweep;
use tooday_bff::modules::task::adapters::memory::{
    InMemoryProjectStore, InMemorySyncCounter, InMemoryTaskStore,
};
use tooday_bff::modules::task::adapters::sql::{SqlProjectStore, SqlTaskStore};
use tooday_bff::modules::task::ports::{ProjectStore, TaskStore};
use tooday_bff::modules::user::adapters::sql::SqlUserReader;
use tooday_bff::modules::user::ports::UserReader;
use tooday_bff::platform::config::load_config;
use tooday_bff::platform::db::migrate::migrate_to_latest;
use tooday_bff::platform::db::postgres::create_postgres_pool;
use tooday_bff::platform::logging::create_logger;
use tooday_bff::platform::sync_broker::InMemorySyncBroker;

/// 도메인 스토어 묶음 — DATABASE_URL 유무로 SQL/인메모리가 갈린다.
struct Stores {
    users: Arc<dyn UserStore>,
    user_reader: Arc<dyn UserReader>,
    tasks: Arc<dyn TaskStore>,
    projects: Arc<dyn ProjectStore>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = load_config()?;
    let logger = create_logger(config.log_format);

    // 배포는 PostgreSQL, 미설정이면 인메모리 어댑터(개발·테스트).
    // TS는 여기서 임베디드 PGlite로 같은 SQL을 돌렸지만 러스트에는 대응물이 없어,
    // 같은 포트를 만족하는 인메모리 구현으로 외부 의존성 0을 유지한다.
    let pool = match &config.database_url {
        Some(url) => {
            let pool = create_postgres_pool(url, config.pg_pool_size).await?;
            let applied = migrate_to_latest(&pool).await?;
            logger.info(
                "database_ready",
                vec![
                    ("engine", "postgres".into()),
                    ("migrationsApplied", applied.len().into()),
                ],
            );
            Some(pool)
        }
        None => {
            logger.info("database_ready", vec![("engine", "memory".into())]);
            None
        }
    };

    let stores = match &pool {
        Some(pool) => Stores {
            users: Arc::new(SqlUserStore::new(pool.clone())),
            user_reader: Arc::new(SqlUserReader::new(pool.clone())),
            tasks: Arc::new(SqlTaskStore::new(pool.clone())),
            projects: Arc::new(SqlProjectStore::new(pool.clone())),
        },
        None => {
            let users = Arc::new(InMemoryUserStore::new());
            let counter = InMemorySyncCounter::new();
            Stores {
                users: Arc::clone(&users) as Arc<_>,
                // 같은 인스턴스가 UserReader도 만족한다 — SQL 세계에서 두 모듈의
                // 어댑터가 같은 users 테이블을 보는 것과 동형이다.
                user_reader: users as Arc<_>,
                tasks: Arc::new(InMemoryTaskStore::new(Arc::clone(&counter))),
                projects: Arc::new(InMemoryProjectStore::new(counter)),
            }
        }
    };

    let bundle = create_refresh_token_store(
        config.redis_url.as_deref(),
        pool.clone(),
        config.refresh_idle_ttl_ms,
        config.refresh_absolute_ttl_ms,
    )?;
    logger.info("refresh_token_store_ready", vec![("backend", format!("{:?}", bundle.backend).into())]);
    let refresh_tokens: Arc<dyn RefreshTokenStore> = Arc::clone(&bundle.store);
    if bundle.needs_expiry_sweep {
        start_refresh_token_sweep(Arc::clone(&bundle.store), Arc::clone(&logger), None).await;
    }

    let port = config.port;
    let access_tokens =
        Arc::new(AccessTokenService::new(&config.jwt_secret, config.access_ttl_ms));
    let app = create_app(AppDeps {
        config,
        users: stores.users,
        user_reader: stores.user_reader,
        refresh_tokens,
        access_tokens,
        tasks: stores.tasks,
        projects: stores.projects,
        sync: InMemorySyncBroker::new(),
        logger: Some(Arc::clone(&logger)),
    });

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
    logger.info("server_listening", vec![("port", port.into())]);
    axum::serve(listener, app).await?;
    Ok(())
}
