use std::sync::Arc;

use serde_json::Value;
use tooday_shared::MeResponse;

use crate::modules::user::ports::UserReader;
use crate::trpc::context::TrpcContext;
use crate::trpc::init::{output, unauthenticated, AuthLevel, Procedure, ProcedureKind, TrpcError};

pub const PROCEDURES: &[Procedure] =
    &[Procedure { name: "me", kind: ProcedureKind::Query, auth: AuthLevel::Session }];

pub struct UserRouterDeps {
    pub users: Arc<dyn UserReader>,
}

pub async fn call(
    deps: &UserRouterDeps,
    ctx: &mut TrpcContext,
    name: &str,
    _input: Option<Value>,
) -> Result<Value, TrpcError> {
    match name {
        // 세션 프로브 — 게이트(회원가입/로그인 포함)가 매 진입마다 부른다. 무효 자격증명
        // (만료·폐기) → 401은 디스패처의 Session 규칙이 거르므로, 여기서 user_id가 None이면
        // 자격증명이 아예 없는 익명이다. 익명은 401 에러가 아니라 200 + user:null로 돌려
        // 캐시에 성공으로 남게 한다(재요청 폭주 제거).
        "me" => {
            let Some(user_id) = ctx.user_id.clone() else {
                return output(MeResponse { user: None });
            };
            // 액세스 JWT는 userId만 담으므로 전체 프로필은 여기서 지연 조회한다(핫패스가 아니라 허용).
            let user = deps.users.find_by_id(&user_id).await?.ok_or_else(unauthenticated)?;
            output(MeResponse { user: Some(user) })
        }
        _ => unreachable!("디스패처가 존재하는 프로시저만 넘긴다"),
    }
}
