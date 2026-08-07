use std::sync::Arc;

use serde_json::Value;
use tooday_shared::{
    AuthResponse, LoginRequest, LogoutResponse, RefreshRequest, RefreshResponse, SignupRequest, TokenPair,
};

use crate::modules::auth::access_token::{AccessTokenClaims, AccessTokens};
use crate::modules::auth::ports::{CreateUserInput, Credentials, RefreshTokenStore, UserStore};
use crate::platform::errors::{DomainError, DomainErrorCode};
use crate::trpc::context::TrpcContext;
use crate::trpc::init::{output, parse_input, AuthLevel, Procedure, ProcedureKind, TrpcError};

pub const PROCEDURES: &[Procedure] = &[
    Procedure { name: "signup", kind: ProcedureKind::Mutation, auth: AuthLevel::Public },
    Procedure { name: "login", kind: ProcedureKind::Mutation, auth: AuthLevel::Public },
    Procedure { name: "refresh", kind: ProcedureKind::Mutation, auth: AuthLevel::Public },
    Procedure { name: "logout", kind: ProcedureKind::Mutation, auth: AuthLevel::Protected },
];

pub struct AuthRouterDeps {
    pub users: Arc<dyn UserStore>,
    pub refresh_tokens: Arc<dyn RefreshTokenStore>,
    pub access_tokens: Arc<dyn AccessTokens>,
}

impl AuthRouterDeps {
    /// 로그인/회원가입 공통 — 세션(리프레시) 발급 + 그 세션의 sid로 액세스 서명.
    async fn issue_tokens(&self, user_id: &str) -> Result<TokenPair, TrpcError> {
        let refresh = self.refresh_tokens.issue(user_id).await?;
        Ok(TokenPair {
            access_token: self
                .access_tokens
                .sign(&AccessTokenClaims { user_id: user_id.to_owned(), session_id: refresh.session_id }),
            refresh_token: refresh.token,
        })
    }
}

pub async fn call(
    deps: &AuthRouterDeps,
    ctx: &mut TrpcContext,
    name: &str,
    input: Option<Value>,
) -> Result<Value, TrpcError> {
    match name {
        "signup" => {
            let request: SignupRequest = parse_input(input)?;
            let user = deps
                .users
                .create(CreateUserInput {
                    email: request.email,
                    password: request.password,
                    name: request.name,
                })
                .await?;
            let tokens = deps.issue_tokens(&user.id).await?;
            ctx.set_auth_cookies(&tokens);
            output(AuthResponse {
                user,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            })
        }

        "login" => {
            let request: LoginRequest = parse_input(input)?;
            let user = deps
                .users
                .verify_credentials(Credentials { email: request.email, password: request.password })
                .await?
                .ok_or_else(|| TrpcError::from(DomainError::new(DomainErrorCode::InvalidCredentials)))?;
            let tokens = deps.issue_tokens(&user.id).await?;
            ctx.set_auth_cookies(&tokens);
            output(AuthResponse {
                user,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            })
        }

        // 액세스 만료 시 재발급 경로 — 리프레시를 회전(idle 슬라이딩 + absolute 캡)한다.
        // 웹은 리프레시 쿠키로, 네이티브 브릿지는 body로 토큰을 넘긴다.
        "refresh" => {
            let request: RefreshRequest = parse_input(input)?;
            let presented = request.refresh_token.or_else(|| ctx.refresh_token.clone());
            let rotated = match presented {
                Some(token) => deps.refresh_tokens.rotate(&token).await?,
                None => None,
            };
            let Some(rotated) = rotated else {
                ctx.clear_auth_cookies();
                return Err(DomainError::new(DomainErrorCode::Unauthenticated).into());
            };
            let tokens: RefreshResponse = TokenPair {
                access_token: deps
                    .access_tokens
                    .sign(&AccessTokenClaims { user_id: rotated.user_id, session_id: rotated.session_id }),
                refresh_token: rotated.token,
            };
            ctx.set_auth_cookies(&tokens);
            output(tokens)
        }

        "logout" => {
            if let Some(token) = ctx.refresh_token.clone() {
                deps.refresh_tokens.revoke(&token).await?;
            }
            ctx.clear_auth_cookies();
            output(LogoutResponse { ok: true })
        }

        _ => unreachable!("디스패처가 존재하는 프로시저만 넘긴다"),
    }
}
