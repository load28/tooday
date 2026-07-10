use serde::Serialize;
use uuid::Uuid;

/// 계약(@tooday/shared userSchema)에 노출되는 유저 표현 — password_hash는 절대 싣지 않는다.
#[derive(Serialize)]
pub struct PublicUser {
    pub id: Uuid,
    pub email: String,
    pub name: String,
}

pub mod routes {
    use axum::extract::{Path, State};
    use axum::Json;
    use serde_json::{json, Value};
    use uuid::Uuid;

    use crate::error::{ApiError, ApiResult};
    use crate::state::AppState;

    /// 읽기 전용 프로필 조회 — users 테이블 쓰기는 auth 흐름만 한다.
    pub async fn find_by_id(State(state): State<AppState>, Path(user_id): Path<Uuid>) -> ApiResult<Json<Value>> {
        let row: Option<(Uuid, String, String)> = sqlx::query_as("select id, email, name from users where id = $1")
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await?;
        let Some((id, email, name)) = row else {
            return Err(ApiError::UserNotFound);
        };
        Ok(Json(json!({ "user": { "id": id, "email": email, "name": name } })))
    }
}
