//! Mirror of `packages/shared/src/user.ts`.

use crate::ir::*;

pub fn module() -> Module {
    Module {
        name: "user",
        decls: vec![
            schema(
                "userSchema",
                "User",
                object(vec![
                    field("id", string()),
                    field("email", string()),
                    field("name", string()),
                ]),
            ),
            schema_doc(
                "meResponseSchema",
                "세션 프로브 — 익명 방문자는 user: null(200). 자격증명이 실렸는데 무효면 BFF가 401을 던진다.",
                "MeResponse",
                object(vec![field("user", r#ref("userSchema").nullable())]),
            ),
        ],
    }
}
