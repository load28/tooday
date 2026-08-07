use serde::{Deserialize, Serialize};

/// 웹 ↔ BFF 간 tRPC 마운트 경로 계약
pub const TRPC_ENDPOINT: &str = "/trpc";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ApiError {
    pub error: ApiErrorBody,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ApiErrorBody {
    pub code: String,
    pub message: String,
}
