//! 포트(헥사고날) — 스토어 인터페이스. `apps/bff/src/modules/task/ports.ts` 대응.
//!
//! TS 포트는 메서드가 전부 `Promise<T>`다(어댑터가 DB IO를 하므로). 여기선 인메모리라
//! IO가 없어 **동기 메서드**로 둔다 — async trait는 tokio를 끌어와 컴파일 비용만 늘고
//! 추론 비교엔 기여하지 않는다. trait 모양(입력·반환 타입)이 추론 비교의 본질이다.
//!
//! 라우터는 이 trait들을 **제네릭 바운드**(`T: TaskStore`)로 받아 정적 디스패치한다 —
//! TS의 구조적 인터페이스(any object with the right shape)와 대비되는 명목적·단형화 경로.

use crate::contract::{
    CreateProjectRequest, CreateTaskRequest, IsoDate, Project, ProjectChange, Task, TaskChange,
    TaskPatch,
};

/// 프로젝트별 완료/전체 집계 — 목록 화면 진행률용(삭제 제외).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectTaskCounts {
    pub project_id: String,
    pub total: u32,
    pub done: u32,
}

pub trait ProjectStore {
    fn list_by_user(&self, user_id: &str) -> Vec<Project>;
    fn find_by_id(&self, user_id: &str, id: &str) -> Option<Project>;
    fn create(&self, user_id: &str, req: &CreateProjectRequest) -> Project;
    fn changes_since(&self, user_id: &str, cursor: u64) -> Vec<ProjectChange>;
}

pub trait TaskStore {
    fn list_range(&self, user_id: &str, from: &IsoDate, to: &IsoDate) -> Vec<Task>;
    /// 소유자가 아니거나 없는(또는 삭제된) 태스크면 `None`.
    fn find_by_id(&self, user_id: &str, id: &str) -> Option<Task>;
    fn list_by_project(&self, user_id: &str, project_id: &str) -> Vec<Task>;
    fn counts_by_project(&self, user_id: &str) -> Vec<ProjectTaskCounts>;
    fn create(&self, user_id: &str, req: &CreateTaskRequest) -> Task;
    /// 소유자가 아니거나 없는(또는 삭제된) 태스크면 `None`.
    fn update(&self, user_id: &str, id: &str, patch: &TaskPatch) -> Option<Task>;
    /// 소프트 삭제. 대상이 없으면(또는 이미 삭제) `false`.
    fn remove(&self, user_id: &str, id: &str) -> bool;
    fn changes_since(&self, user_id: &str, cursor: u64) -> Vec<TaskChange>;
    /// 유저의 현재 sync seq — 클라이언트 초기 커서.
    fn sync_cursor(&self, user_id: &str) -> u64;
}

/// SSE 신호 브로커. 여기선 알림 대상만 기록해 테스트에서 관찰한다.
/// (`apps/bff/src/platform/sync-broker.ts`의 축소판.)
pub trait SyncBroker {
    fn notify(&self, user_id: &str);
}
