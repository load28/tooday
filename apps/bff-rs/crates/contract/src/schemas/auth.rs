//! Mirror of `packages/shared/src/auth.ts`.

use crate::ir::*;

pub fn module() -> Module {
    Module {
        name: "auth",
        decls: vec![
            const_num("MIN_PASSWORD_LENGTH", 8),
            schema_doc(
                "signupRequestSchema",
                "스키마는 검증 규칙(계약)만 정의한다. 사용자향 문구는 각 화면이 발생 가능한\nissue 타입(v.InferIssue)으로 매핑해 소유한다.",
                "SignupRequest",
                object(vec![
                    field("email", string().trim().email()),
                    field(
                        "password",
                        string().min_length(NumArg::Const("MIN_PASSWORD_LENGTH")),
                    ),
                    field("name", string().trim().min_length(1)),
                ]),
            ),
            schema(
                "loginRequestSchema",
                "LoginRequest",
                object(vec![
                    field("email", string().trim().min_length(1)),
                    field("password", string().min_length(1)),
                ]),
            ),
            schema_doc(
                "tokenPairSchema",
                "토큰 쌍. 웹은 이 값을 무시하고 httpOnly 쿠키로 인증하지만, 네이티브/웹뷰\n브릿지는 쿠키를 못 쓰므로 body로 받아 Authorization 헤더에 싣는다.",
                "TokenPair",
                object(vec![
                    field("accessToken", string()),
                    field("refreshToken", string()),
                ]),
            ),
            schema(
                "authResponseSchema",
                "AuthResponse",
                object(vec![
                    field("user", r#ref("userSchema")),
                    spread("tokenPairSchema"),
                ]),
            ),
            schema_doc(
                "refreshRequestSchema",
                "리프레시 회전 요청. 웹은 body 없이 리프레시 쿠키로 인증하고, 네이티브/웹뷰\n브릿지는 쿠키를 못 쓰므로 refreshToken을 body로 넘긴다 — 둘 다 지원하도록 optional.",
                "RefreshRequest",
                object(vec![field("refreshToken", string().optional())]),
            ),
            schema_doc(
                "refreshResponseSchema",
                "리프레시 회전 결과 — 새 토큰 쌍만 돌려준다(웹은 쿠키로도 함께 받음)",
                "RefreshResponse",
                r#ref("tokenPairSchema"),
            ),
        ],
    }
}
