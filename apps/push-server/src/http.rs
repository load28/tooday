use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::State;
use axum::http::{header, HeaderMap, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use deadpool_postgres::Pool;
use serde::Deserialize;

use crate::auth::verify_access_token;
use crate::db;

/// 구독 등록/해제 HTTP API — BFF를 거치지 않는 push-server 자체 표면.
/// 클라이언트는 BFF 로그인으로 받은 액세스 JWT를 그대로 Bearer로 보낸다.
#[derive(Clone)]
pub struct ApiState {
    pub pool: Pool,
    pub jwt_secret: Arc<str>,
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
        .route("/subscriptions", post(register).delete(unregister))
        .with_state(state)
}

pub async fn serve(addr: SocketAddr, state: ApiState) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!(%addr, "구독 등록 HTTP API 대기");
    axum::serve(listener, router(state)).await?;
    Ok(())
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
    let user_id = match authed_user(&headers, &state.jwt_secret) {
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
    let user_id = match authed_user(&headers, &state.jwt_secret) {
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
