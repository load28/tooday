use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::{json, Value};

/// BFF와 공유하는 도메인 에러 코드 — HTTP 상태·코드·표준 메시지를 한 곳에 못박는다.
/// BFF 어댑터는 코드를 DomainError로 되돌려 tRPC 에러로 매핑한다.
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("이미 가입된 이메일입니다.")]
    EmailTaken,
    #[error("이메일 또는 비밀번호가 올바르지 않습니다.")]
    InvalidCredentials,
    #[error("인증이 필요합니다.")]
    Unauthenticated,
    #[error("프로젝트를 찾을 수 없습니다.")]
    ProjectNotFound,
    #[error("작업을 찾을 수 없습니다.")]
    TaskNotFound,
    #[error("사용자를 찾을 수 없습니다.")]
    UserNotFound,
    #[error("서버 오류가 발생했습니다.")]
    Internal(#[source] Box<dyn std::error::Error + Send + Sync>),
}

impl ApiError {
    fn status(&self) -> StatusCode {
        match self {
            Self::EmailTaken => StatusCode::CONFLICT,
            Self::InvalidCredentials | Self::Unauthenticated => StatusCode::UNAUTHORIZED,
            Self::ProjectNotFound | Self::TaskNotFound | Self::UserNotFound => StatusCode::NOT_FOUND,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn code(&self) -> &'static str {
        match self {
            Self::EmailTaken => "EMAIL_TAKEN",
            Self::InvalidCredentials => "INVALID_CREDENTIALS",
            Self::Unauthenticated => "UNAUTHENTICATED",
            Self::ProjectNotFound => "PROJECT_NOT_FOUND",
            Self::TaskNotFound => "TASK_NOT_FOUND",
            Self::UserNotFound => "USER_NOT_FOUND",
            Self::Internal(_) => "INTERNAL_ERROR",
        }
    }
}

pub fn error_body(code: &str, message: &str) -> Value {
    json!({ "error": { "code": code, "message": message } })
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        if let Self::Internal(source) = &self {
            tracing::error!(error = %source, "internal_error");
        }
        (self.status(), Json(error_body(self.code(), &self.to_string()))).into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(error: sqlx::Error) -> Self {
        Self::Internal(Box::new(error))
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
