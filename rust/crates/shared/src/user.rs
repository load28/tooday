use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: String,
}

/// 세션 프로브 — 익명 방문자는 user: null(200). 자격증명이 실렸는데 무효면 BFF가 401을 던진다.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MeResponse {
    pub user: Option<User>,
}
