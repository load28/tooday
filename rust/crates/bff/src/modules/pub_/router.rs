use tooday_shared::{AppConfigResponse, AppFeatures};

use crate::trpc::init::{AuthLevel, Procedure, ProcedureKind};

/// 공유 캐시 대상 — 유저별로 달라지는 데이터 금지 (컨텍스트의 userId 참조 금지)
pub const PROCEDURES: &[Procedure] =
    &[Procedure { name: "appConfig", kind: ProcedureKind::Query, auth: AuthLevel::Public }];

pub fn app_config() -> AppConfigResponse {
    AppConfigResponse {
        version: "0.0.0".into(),
        min_supported_app_version: "0.0.0".into(),
        features: AppFeatures { projects: true, timeline: true },
    }
}
