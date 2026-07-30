//! Mirror of `packages/shared/src/pub.ts`.

use crate::ir::*;

pub fn module() -> Module {
    Module {
        name: "pub",
        decls: vec![schema_doc(
            "appConfigResponseSchema",
            "앱 부트스트랩 시 클라이언트가 읽는 공개 설정 — 유저별로 달라지지 않는다(공유 캐시 대상).",
            "AppConfigResponse",
            object(vec![
                field("version", string()),
                field("minSupportedAppVersion", string()),
                field(
                    "features",
                    object(vec![
                        field("projects", boolean()),
                        field("timeline", boolean()),
                    ]),
                ),
            ]),
        )],
    }
}
