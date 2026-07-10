//! 인증 흐름 엔드포인트 — BFF AuthGateway가 1:1로 호출한다.
//! 토큰 발급 정책(리프레시 세션 발급 + 그 sid로 액세스 서명)이 여기 산다.

use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::auth::password::{hash_password, verify_password};
use crate::auth::refresh::RefreshTokenStore;
use crate::error::{ApiError, ApiResult};
use crate::ids::new_id;
use crate::state::AppState;
use crate::user::PublicUser;

#[derive(Deserialize)]
pub struct SignupBody {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshBody {
    pub refresh_token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogoutBody {
    pub refresh_token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyBody {
    pub access_token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub user: PublicUser,
    #[serde(flatten)]
    pub tokens: TokenPair,
}

fn internal(error: impl std::error::Error + Send + Sync + 'static) -> ApiError {
    ApiError::Internal(Box::new(error))
}

/// 세션(리프레시) 발급 + 그 세션의 sid로 액세스 서명 — 로그인/회원가입 공통.
async fn issue_tokens(state: &AppState, user_id: Uuid) -> ApiResult<TokenPair> {
    let refresh = state.refresh.issue(user_id).await?;
    let access = state
        .tokens
        .sign(&user_id.to_string(), &refresh.session_id.to_string())
        .map_err(internal)?;
    Ok(TokenPair { access_token: access, refresh_token: refresh.token })
}

pub async fn signup(State(state): State<AppState>, Json(body): Json<SignupBody>) -> ApiResult<Json<AuthResponse>> {
    let email = body.email.trim().to_lowercase();
    let existing: Option<(Uuid,)> = sqlx::query_as("select id from users where email = $1")
        .bind(&email)
        .fetch_optional(&state.pool)
        .await?;
    if existing.is_some() {
        return Err(ApiError::EmailTaken);
    }

    // argon2는 CPU 바운드(수십 ms) — 런타임 워커를 막지 않게 blocking 풀로 보낸다.
    let password = body.password;
    let password_hash = tokio::task::spawn_blocking(move || hash_password(&password))
        .await
        .map_err(internal)?
        .map_err(|error| ApiError::Internal(error.to_string().into()))?;

    let user = PublicUser { id: new_id(), email, name: body.name };
    let inserted = sqlx::query("insert into users (id, email, name, password_hash) values ($1, $2, $3, $4)")
        .bind(user.id)
        .bind(&user.email)
        .bind(&user.name)
        .bind(&password_hash)
        .execute(&state.pool)
        .await;
    if let Err(error) = inserted {
        // 사전 조회와 insert 사이의 경합은 unique 제약이 잡는다 — 같은 EMAIL_TAKEN으로 응답.
        if let sqlx::Error::Database(db_error) = &error {
            if db_error.code().as_deref() == Some("23505") {
                return Err(ApiError::EmailTaken);
            }
        }
        return Err(error.into());
    }

    let tokens = issue_tokens(&state, user.id).await?;
    Ok(Json(AuthResponse { user, tokens }))
}

pub async fn login(State(state): State<AppState>, Json(body): Json<LoginBody>) -> ApiResult<Json<AuthResponse>> {
    let email = body.email.trim().to_lowercase();
    let row: Option<(Uuid, String, String, String)> =
        sqlx::query_as("select id, email, name, password_hash from users where email = $1")
            .bind(&email)
            .fetch_optional(&state.pool)
            .await?;
    let Some((id, email, name, password_hash)) = row else {
        return Err(ApiError::InvalidCredentials);
    };

    let password = body.password;
    let valid = tokio::task::spawn_blocking(move || verify_password(&password, &password_hash))
        .await
        .map_err(internal)?;
    if !valid {
        return Err(ApiError::InvalidCredentials);
    }

    let user = PublicUser { id, email, name };
    let tokens = issue_tokens(&state, user.id).await?;
    Ok(Json(AuthResponse { user, tokens }))
}

/// 액세스 만료 시 재발급 경로 — 리프레시를 회전(idle 슬라이딩 + absolute 캡)한다.
pub async fn refresh(State(state): State<AppState>, Json(body): Json<RefreshBody>) -> ApiResult<Json<TokenPair>> {
    let Some(rotated) = state.refresh.rotate(&body.refresh_token).await? else {
        return Err(ApiError::Unauthenticated);
    };
    let access = state
        .tokens
        .sign(&rotated.user_id.to_string(), &rotated.session_id.to_string())
        .map_err(internal)?;
    Ok(Json(TokenPair { access_token: access, refresh_token: rotated.token }))
}

pub async fn logout(State(state): State<AppState>, Json(body): Json<LogoutBody>) -> ApiResult<Json<Value>> {
    state.refresh.revoke(&body.refresh_token).await?;
    Ok(Json(json!({ "ok": true })))
}

/// 인증 핫패스 — 액세스 JWT 서명·만료 검증 + 세션 라이브니스 체크를 한 호출로.
/// 유효하면 userId, 아니면 null. 라이브니스 저장소 장애는 **fail-closed**(null)로 거부한다.
pub async fn verify(State(state): State<AppState>, Json(body): Json<VerifyBody>) -> Json<Value> {
    let Some(claims) = state.tokens.verify(&body.access_token) else {
        return Json(json!({ "userId": null }));
    };
    match state.refresh.is_session_live(&claims.session_id).await {
        Ok(true) => Json(json!({ "userId": claims.user_id })),
        Ok(false) | Err(_) => Json(json!({ "userId": null })),
    }
}
