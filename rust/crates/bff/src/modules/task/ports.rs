use async_trait::async_trait;
use tooday_shared::{Project, ProjectChange, ProjectColor, Task, TaskChange, TaskPatch};

use crate::platform::errors::StoreResult;

#[derive(Debug, Clone)]
pub struct CreateProjectInput {
    pub user_id: String,
    pub name: String,
    pub color: ProjectColor,
}

#[derive(Debug, Clone)]
pub struct CreateTaskInput {
    pub user_id: String,
    pub title: String,
    pub project_id: Option<String>,
    pub date: String,
    pub start_at: String,
    pub duration_min: i64,
}

#[derive(Debug, Clone)]
pub struct ListTasksRangeInput {
    pub user_id: String,
    /// 'YYYY-MM-DD' inclusive
    pub from: String,
    /// 'YYYY-MM-DD' inclusive
    pub to: String,
}

/// 의도 기반 부분 업데이트 — patch에 담긴 필드만 최신 행에 적용한다 (필드 단위 LWW)
#[derive(Debug, Clone)]
pub struct UpdateTaskInput {
    pub user_id: String,
    pub id: String,
    pub patch: TaskPatch,
}

/// 델타 동기화 — cursor(마지막으로 본 sync seq) 이후의 변경
#[derive(Debug, Clone)]
pub struct ListChangesInput {
    pub user_id: String,
    pub cursor: i64,
}

/// 소유자 스코프의 단건 참조 — 조회·삭제·프로젝트 필터에서 재사용
#[derive(Debug, Clone)]
pub struct TaskRefInput {
    pub user_id: String,
    pub id: String,
}

#[derive(Debug, Clone)]
pub struct ListTasksByProjectInput {
    pub user_id: String,
    pub project_id: String,
}

/// 프로젝트별 태스크 집계 — 목록 화면의 진행률(완료/전체)에 쓴다 (삭제 제외)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectTaskCounts {
    pub project_id: String,
    pub total: i64,
    pub done: i64,
}

#[async_trait]
pub trait ProjectStore: Send + Sync {
    async fn list_by_user(&self, user_id: &str) -> StoreResult<Vec<Project>>;
    async fn find_by_id(&self, input: &TaskRefInput) -> StoreResult<Option<Project>>;
    async fn create(&self, input: CreateProjectInput) -> StoreResult<Project>;
    async fn changes_since(&self, input: ListChangesInput) -> StoreResult<Vec<ProjectChange>>;
}

#[async_trait]
pub trait TaskStore: Send + Sync {
    async fn list_range(&self, input: ListTasksRangeInput) -> StoreResult<Vec<Task>>;
    /// 소유자가 아니거나 없는(또는 삭제된) 태스크면 None
    async fn find_by_id(&self, input: &TaskRefInput) -> StoreResult<Option<Task>>;
    /// 프로젝트 상세(보드)용 — 그 프로젝트의 삭제되지 않은 태스크 전부(상태 무관)
    async fn list_by_project(&self, input: ListTasksByProjectInput) -> StoreResult<Vec<Task>>;
    /// 프로젝트별 완료/전체 태스크 수 — 프로젝트 없는(project_id null) 태스크는 제외
    async fn counts_by_project(&self, user_id: &str) -> StoreResult<Vec<ProjectTaskCounts>>;
    async fn create(&self, input: CreateTaskInput) -> StoreResult<Task>;
    /// 소유자가 아니거나 없는(또는 삭제된) 태스크면 None
    async fn update(&self, input: UpdateTaskInput) -> StoreResult<Option<Task>>;
    /// 소프트 삭제 — tombstone으로 델타에 실린다. 대상이 없으면(또는 이미 삭제) false
    async fn remove(&self, input: &TaskRefInput) -> StoreResult<bool>;
    async fn changes_since(&self, input: ListChangesInput) -> StoreResult<Vec<TaskChange>>;
    /// 유저의 현재 sync seq — 클라이언트의 초기 커서
    async fn sync_cursor(&self, user_id: &str) -> StoreResult<i64>;
}
