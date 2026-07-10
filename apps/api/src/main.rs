mod auth;
mod config;
mod error;
mod ids;
mod ordering;
mod state;
mod sync_seq;
mod task;
mod user;

use std::sync::Arc;
use std::time::Duration;

use axum::extract::{Request, State};
use axum::http::{header, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use sqlx::postgres::PgPoolOptions;
use tower_http::trace::TraceLayer;

use crate::auth::refresh::RefreshTokenStore;
use crate::config::ApiConfig;
use crate::state::AppState;

#[tokio::main]
async fn main() {
    let config = ApiConfig::from_env().unwrap_or_else(|message| {
        eprintln!("config error: {message}");
        std::process::exit(1);
    });

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "tooday_api=info,tower_http=warn".into()),
        )
        .init();

    let pool = PgPoolOptions::new()
        .max_connections(config.pg_pool_size)
        .connect(&config.database_url)
        .await
        .expect("PostgreSQL 연결 실패 — DATABASE_URL을 확인하세요");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("마이그레이션 적용 실패");
    tracing::info!("database_ready");

    let refresh_store = auth::refresh::create_store(&config, pool.clone())
        .await
        .expect("리프레시 토큰 저장소 초기화 실패");
    tracing::info!(backend = refresh_store.backend_name(), "refresh_token_store_ready");

    // SQL 백엔드만 만료 행이 누적되므로 주기 스윕을 돈다 (Redis는 네이티브 TTL이 청소).
    if refresh_store.needs_expiry_sweep() {
        let store = refresh_store.clone();
        tokio::spawn(async move {
            let mut timer = tokio::time::interval(Duration::from_secs(60 * 60));
            loop {
                timer.tick().await;
                match store.delete_expired().await {
                    Ok(deleted) if deleted > 0 => tracing::info!(deleted, "refresh_tokens_swept"),
                    Ok(_) => {}
                    Err(error) => tracing::error!(%error, "refresh_token_sweep_failed"),
                }
            }
        });
    }

    let state = AppState {
        pool,
        tokens: Arc::new(auth::jwt::AccessTokens::new(&config.jwt_secret, config.access_ttl_ms)),
        refresh: refresh_store,
    };

    let internal = Router::new()
        .route("/internal/auth/signup", post(auth::routes::signup))
        .route("/internal/auth/login", post(auth::routes::login))
        .route("/internal/auth/refresh", post(auth::routes::refresh))
        .route("/internal/auth/logout", post(auth::routes::logout))
        .route("/internal/auth/verify", post(auth::routes::verify))
        .route("/internal/users/{user_id}", get(user::routes::find_by_id))
        .route(
            "/internal/users/{user_id}/tasks",
            get(task::routes::list_range).post(task::routes::create_task),
        )
        .route(
            "/internal/users/{user_id}/tasks/{id}",
            get(task::routes::find_task)
                .patch(task::routes::update_task)
                .delete(task::routes::remove_task),
        )
        .route("/internal/users/{user_id}/task-changes", get(task::routes::task_changes))
        .route("/internal/users/{user_id}/project-changes", get(task::routes::project_changes))
        .route("/internal/users/{user_id}/task-counts", get(task::routes::task_counts))
        .route("/internal/users/{user_id}/sync-cursor", get(task::routes::sync_cursor))
        .route(
            "/internal/users/{user_id}/projects",
            get(task::routes::list_projects).post(task::routes::create_project),
        )
        .route("/internal/users/{user_id}/projects/{id}", get(task::routes::find_project))
        .route("/internal/users/{user_id}/projects/{id}/tasks", get(task::routes::list_project_tasks))
        .layer(middleware::from_fn_with_state(
            config.internal_token.clone(),
            require_internal_token,
        ));

    let app = Router::new()
        .route("/health", get(|| async { Json(serde_json::json!({ "status": "ok" })) }))
        .merge(internal)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", config.port))
        .await
        .expect("포트 바인딩 실패");
    tracing::info!(port = config.port, "listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .expect("서버 종료");
}

/// BFF ↔ API 내부 신뢰 경계 — INTERNAL_API_TOKEN 설정 시 Bearer 일치를 요구한다.
async fn require_internal_token(
    State(expected): State<Option<String>>,
    request: Request,
    next: Next,
) -> Response {
    let Some(expected) = expected else {
        return next.run(request).await;
    };
    let presented = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));
    if presented != Some(expected.as_str()) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(error::error_body("UNAUTHENTICATED", "인증이 필요합니다.")),
        )
            .into_response();
    }
    next.run(request).await
}
