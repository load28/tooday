use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use tooday_shared::{ApiError, ApiErrorBody};

pub fn error_response(status: StatusCode, code: &str, message: &str) -> Response {
    (
        status,
        Json(ApiError {
            error: ApiErrorBody { code: code.to_owned(), message: message.to_owned() },
        }),
    )
        .into_response()
}
