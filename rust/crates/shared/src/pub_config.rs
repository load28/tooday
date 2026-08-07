use serde::{Deserialize, Serialize};

/// 앱 부트스트랩 시 클라이언트가 읽는 공개 설정 — 유저별로 달라지지 않는다(공유 캐시 대상).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfigResponse {
    pub version: String,
    pub min_supported_app_version: String,
    pub features: AppFeatures,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AppFeatures {
    pub projects: bool,
    pub timeline: bool,
}
