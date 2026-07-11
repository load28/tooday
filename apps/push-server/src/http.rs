use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::State;
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use deadpool_postgres::Pool;
use serde::Deserialize;
use tokio::sync::watch;

use crate::auth::verify_access_token;
use crate::db;
use crate::metrics::Metrics;

/// 운영 표면(/healthz, /readyz, /metrics)은 항상 뜨고, 구독 등록/해제는
/// BFF 액세스 JWT를 검증할 시크릿이 있을 때만 활성화된다.
#[derive(Clone)]
pub struct ApiState {
    pub pool: Pool,
    /// BFF와 공유하는 JWT 시크릿 — None이면 /subscriptions는 503.
    pub jwt_secret: Option<Arc<str>>,
    pub metrics: Arc<Metrics>,
}

const PLATFORMS: &[&str] = &["expo", "fcm", "apns", "webpush"];

#[derive(Deserialize)]
struct RegisterRequest {
    token: String,
    platform: String,
}

#[derive(Deserialize)]
struct UnregisterRequest {
    token: String,
}

pub fn router(state: ApiState) -> Router {
    Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .route("/readyz", get(readyz))
        .route("/metrics", get(metrics))
        .route("/subscriptions", post(register).delete(unregister))
        .with_state(state)
}

pub async fn serve(
    addr: SocketAddr,
    state: ApiState,
    mut shutdown: watch::Receiver<bool>,
) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!(%addr, "HTTP 서버 대기 (healthz/readyz/metrics + subscriptions)");
    axum::serve(listener, router(state))
        .with_graceful_shutdown(async move {
            let _ = shutdown.changed().await;
        })
        .await?;
    Ok(())
}

/// readiness — DB에 실제로 질의가 나가는지까지 본다 (k8s readinessProbe 자리).
async fn readyz(State(state): State<ApiState>) -> impl IntoResponse {
    let ready = match state.pool.get().await {
        Ok(client) => client.simple_query("select 1").await.is_ok(),
        Err(_) => false,
    };
    if ready {
        (StatusCode::OK, "ok")
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, "db unreachable")
    }
}

async fn metrics(State(state): State<ApiState>) -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "text/plain; version=0.0.4")],
        state.metrics.render_prometheus(),
    )
}

fn authed_user(headers: &HeaderMap, secret: &str) -> Result<String, StatusCode> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;
    verify_access_token(token, secret).ok_or(StatusCode::UNAUTHORIZED)
}

async fn register(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<RegisterRequest>,
) -> StatusCode {
    let Some(secret) = &state.jwt_secret else {
        return StatusCode::SERVICE_UNAVAILABLE; // PUSH_JWT_SECRET 미설정
    };
    let user_id = match authed_user(&headers, secret) {
        Ok(user_id) => user_id,
        Err(status) => return status,
    };
    if req.token.trim().is_empty() || !PLATFORMS.contains(&req.platform.as_str()) {
        return StatusCode::BAD_REQUEST;
    }
    with_client(&state, |client| async move {
        db::upsert_subscription(&client, &req.token, &user_id, &req.platform).await
    })
    .await
}

async fn unregister(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<UnregisterRequest>,
) -> StatusCode {
    let Some(secret) = &state.jwt_secret else {
        return StatusCode::SERVICE_UNAVAILABLE;
    };
    let user_id = match authed_user(&headers, secret) {
        Ok(user_id) => user_id,
        Err(status) => return status,
    };
    with_client(&state, |client| async move {
        db::delete_subscription(&client, &req.token, &user_id).await
    })
    .await
}

async fn with_client<F, Fut>(state: &ApiState, run: F) -> StatusCode
where
    F: FnOnce(deadpool_postgres::Client) -> Fut,
    Fut: std::future::Future<Output = anyhow::Result<()>>,
{
    let client = match state.pool.get().await {
        Ok(client) => client,
        Err(err) => {
            tracing::error!(error = %err, "DB 커넥션 획득 실패");
            return StatusCode::SERVICE_UNAVAILABLE;
        }
    };
    match run(client).await {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(err) => {
            tracing::error!(error = format!("{err:#}"), "구독 쓰기 실패");
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
