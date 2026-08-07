//! 프로시저 경로·쿼리 키의 단일 소유자.
//!
//! TS는 `trpc.task.range.queryKey(input)`처럼 라우터 타입에서 경로를 파생해 하드코딩을
//! 없앴다. 러스트에서는 경로 상수를 여기 한 곳에 모으고 호출·키 생성을 함께 제공해,
//! 화면이 경로 문자열을 직접 쓰지 않게 한다.

use tooday_shared::{
    AuthResponse, CreateProjectRequest, CreateTaskRequest, DeletedTaskResponse, LoginRequest, LogoutResponse,
    MeResponse, ProjectDetailRequest, ProjectDetailResponse, ProjectListResponse, ProjectResponse,
    SignupRequest, SyncChangesRequest, SyncChangesResponse, TaskIdRequest, TaskRangeRequest,
    TaskRangeResponse, TaskResponse, UpdateTaskRequest,
};

use crate::app::trpc::{TrpcClient, TrpcResult};
use crate::shared::query::QueryKey;

pub mod path {
    pub const USER_ME: &str = "user.me";
    pub const AUTH_SIGNUP: &str = "auth.signup";
    pub const AUTH_LOGIN: &str = "auth.login";
    pub const AUTH_LOGOUT: &str = "auth.logout";
    pub const TASK_RANGE: &str = "task.range";
    pub const TASK_BY_ID: &str = "task.byId";
    pub const TASK_CREATE: &str = "task.create";
    pub const TASK_UPDATE: &str = "task.update";
    pub const TASK_DELETE: &str = "task.delete";
    pub const TASK_CHANGES: &str = "task.changes";
    pub const TASK_CREATE_PROJECT: &str = "task.createProject";
    pub const TASK_PROJECTS: &str = "task.projects";
    pub const TASK_PROJECT: &str = "task.project";
}

// --- 쿼리 키 -----------------------------------------------------------------

pub fn me_key() -> QueryKey {
    QueryKey::bare(path::USER_ME)
}

pub fn range_key(input: &TaskRangeRequest) -> QueryKey {
    QueryKey::new(path::TASK_RANGE, input)
}

/// `task.range`의 모든 입력 — 뮤테이션 후 통째로 비울 때 쓴다(전략 ④)
pub fn range_prefix() -> QueryKey {
    QueryKey::prefix(path::TASK_RANGE)
}

pub fn task_key(id: &str) -> QueryKey {
    QueryKey::new(path::TASK_BY_ID, &TaskIdRequest { id: id.to_owned() })
}

pub fn projects_key() -> QueryKey {
    QueryKey::bare(path::TASK_PROJECTS)
}

pub fn project_key(project_id: &str) -> QueryKey {
    QueryKey::new(path::TASK_PROJECT, &ProjectDetailRequest { project_id: project_id.to_owned() })
}

// --- 호출 --------------------------------------------------------------------

impl TrpcClient {
    pub async fn me(&self) -> TrpcResult<MeResponse> {
        self.query_bare(path::USER_ME).await
    }

    pub async fn signup(&self, input: &SignupRequest) -> TrpcResult<AuthResponse> {
        self.mutate(path::AUTH_SIGNUP, input).await
    }

    pub async fn login(&self, input: &LoginRequest) -> TrpcResult<AuthResponse> {
        self.mutate(path::AUTH_LOGIN, input).await
    }

    pub async fn logout(&self) -> TrpcResult<LogoutResponse> {
        self.mutate(path::AUTH_LOGOUT, &serde_json::Value::Null).await
    }

    pub async fn task_range(&self, input: &TaskRangeRequest) -> TrpcResult<TaskRangeResponse> {
        self.query(path::TASK_RANGE, input).await
    }

    pub async fn task_by_id(&self, id: &str) -> TrpcResult<TaskResponse> {
        self.query(path::TASK_BY_ID, &TaskIdRequest { id: id.to_owned() }).await
    }

    pub async fn create_task(&self, input: &CreateTaskRequest) -> TrpcResult<TaskResponse> {
        self.mutate(path::TASK_CREATE, input).await
    }

    pub async fn update_task(&self, input: &UpdateTaskRequest) -> TrpcResult<TaskResponse> {
        self.mutate(path::TASK_UPDATE, input).await
    }

    pub async fn delete_task(&self, id: &str) -> TrpcResult<DeletedTaskResponse> {
        self.mutate(path::TASK_DELETE, &TaskIdRequest { id: id.to_owned() }).await
    }

    pub async fn task_changes(&self, cursor: i64) -> TrpcResult<SyncChangesResponse> {
        self.query(path::TASK_CHANGES, &SyncChangesRequest { cursor }).await
    }

    pub async fn create_project(&self, input: &CreateProjectRequest) -> TrpcResult<ProjectResponse> {
        self.mutate(path::TASK_CREATE_PROJECT, input).await
    }

    pub async fn projects(&self) -> TrpcResult<ProjectListResponse> {
        self.query_bare(path::TASK_PROJECTS).await
    }

    pub async fn project(&self, project_id: &str) -> TrpcResult<ProjectDetailResponse> {
        self.query(path::TASK_PROJECT, &ProjectDetailRequest { project_id: project_id.to_owned() }).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 같은_입력은_같은_키를_낸다() {
        let input = TaskRangeRequest { from: "2026-07-02".into(), to: "2026-07-08".into() };
        assert_eq!(range_key(&input), range_key(&input));
    }

    #[test]
    fn 다른_입력은_다른_키를_낸다() {
        let a = TaskRangeRequest { from: "2026-07-02".into(), to: "2026-07-08".into() };
        let b = TaskRangeRequest { from: "2026-07-09".into(), to: "2026-07-15".into() };
        assert_ne!(range_key(&a), range_key(&b));
    }

    #[test]
    fn 경로_접두_키는_같은_경로의_모든_입력을_가리킨다() {
        assert_eq!(range_prefix().path, path::TASK_RANGE);
        assert_eq!(range_prefix().input, None);
    }
}
