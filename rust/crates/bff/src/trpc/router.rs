use std::sync::Arc;

use serde_json::Value;

use crate::modules::auth::access_token::AccessTokens;
use crate::modules::auth::ports::{RefreshTokenStore, UserStore};
use crate::modules::auth::router::AuthRouterDeps;
use crate::modules::task::ports::{ProjectStore, TaskStore};
use crate::modules::task::router::TaskRouterDeps;
use crate::modules::user::ports::UserReader;
use crate::modules::user::router::UserRouterDeps;
use crate::modules::{auth, pub_, task, user};
use crate::platform::sync_broker::SyncBroker;
use crate::trpc::context::TrpcContext;
use crate::trpc::init::{
    output, unauthenticated, AuthLevel, Procedure, ProcedureKind, TrpcError, TrpcErrorCode,
};

pub struct AppRouterDeps {
    pub users: Arc<dyn UserStore>,
    pub user_reader: Arc<dyn UserReader>,
    pub refresh_tokens: Arc<dyn RefreshTokenStore>,
    pub access_tokens: Arc<dyn AccessTokens>,
    pub tasks: Arc<dyn TaskStore>,
    pub projects: Arc<dyn ProjectStore>,
    pub sync: Arc<dyn SyncBroker>,
}

/// 조립된 앱 라우터 — 네임스페이스별 모듈 라우터를 하나로 묶는다.
pub struct AppRouter {
    auth: AuthRouterDeps,
    user: UserRouterDeps,
    task: TaskRouterDeps,
}

impl AppRouter {
    pub fn new(deps: AppRouterDeps) -> Self {
        Self {
            auth: AuthRouterDeps {
                users: deps.users,
                refresh_tokens: deps.refresh_tokens,
                access_tokens: deps.access_tokens,
            },
            user: UserRouterDeps { users: deps.user_reader },
            task: TaskRouterDeps { tasks: deps.tasks, projects: deps.projects, sync: deps.sync },
        }
    }

    /// 'namespace.procedure' 경로를 선언된 프로시저로 해석한다. 없으면 None → 404.
    pub fn lookup(path: &str) -> Option<Procedure> {
        let (namespace, name) = path.split_once('.')?;
        let procedures: &[Procedure] = match namespace {
            "pub" => pub_::router::PROCEDURES,
            "auth" => auth::router::PROCEDURES,
            "user" => user::router::PROCEDURES,
            "task" => task::router::PROCEDURES,
            _ => return None,
        };
        procedures.iter().find(|procedure| procedure.name == name).copied()
    }

    pub async fn call(
        &self,
        ctx: &mut TrpcContext,
        path: &str,
        kind: ProcedureKind,
        input: Option<Value>,
    ) -> Result<Value, TrpcError> {
        let Some(procedure) = Self::lookup(path) else {
            return Err(TrpcError::new(
                TrpcErrorCode::NotFound,
                format!("No procedure found on path \"{path}\""),
            ));
        };
        // 쿼리를 POST로, 뮤테이션을 GET으로 부르는 것은 tRPC가 거부한다
        if procedure.kind != kind {
            return Err(TrpcError::new(
                TrpcErrorCode::MethodNotSupported,
                format!("Unsupported {} on path \"{path}\"", method_name(kind)),
            ));
        }

        // TS의 protectedProcedure / sessionProcedure 미들웨어와 같은 규칙
        match procedure.auth {
            AuthLevel::Public => {}
            AuthLevel::Protected => {
                if ctx.user_id.is_none() {
                    return Err(unauthenticated());
                }
            }
            AuthLevel::Session => {
                if ctx.user_id.is_none() && ctx.has_credential {
                    return Err(unauthenticated());
                }
            }
        }

        let (namespace, name) = path.split_once('.').expect("lookup이 통과한 경로");
        match namespace {
            "pub" => output(pub_::router::app_config()),
            "auth" => auth::router::call(&self.auth, ctx, name, input).await,
            "user" => user::router::call(&self.user, ctx, name, input).await,
            "task" => task::router::call(&self.task, ctx, name, input).await,
            _ => unreachable!("lookup이 네임스페이스를 이미 확인했다"),
        }
    }
}

fn method_name(kind: ProcedureKind) -> &'static str {
    match kind {
        ProcedureKind::Query => "GET-request",
        ProcedureKind::Mutation => "POST-request",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 선언된_프로시저만_찾는다() {
        assert_eq!(AppRouter::lookup("pub.appConfig").map(|p| p.kind), Some(ProcedureKind::Query));
        assert_eq!(AppRouter::lookup("auth.signup").map(|p| p.kind), Some(ProcedureKind::Mutation));
        assert_eq!(AppRouter::lookup("pub.doesNotExist"), None);
        assert_eq!(AppRouter::lookup("nope.thing"), None);
        assert_eq!(AppRouter::lookup("noDot"), None);
    }

    #[test]
    fn 인증_수준이_선언대로다() {
        assert_eq!(AppRouter::lookup("pub.appConfig").map(|p| p.auth), Some(AuthLevel::Public));
        assert_eq!(AppRouter::lookup("auth.login").map(|p| p.auth), Some(AuthLevel::Public));
        assert_eq!(AppRouter::lookup("auth.logout").map(|p| p.auth), Some(AuthLevel::Protected));
        assert_eq!(AppRouter::lookup("user.me").map(|p| p.auth), Some(AuthLevel::Session));
        assert_eq!(AppRouter::lookup("task.range").map(|p| p.auth), Some(AuthLevel::Protected));
    }
}
