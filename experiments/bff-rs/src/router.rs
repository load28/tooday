//! task 라우터 — 9개 프로시저 핸들러. `apps/bff/src/modules/task/router.ts` 포팅.
//!
//! tRPC 프로시저를 순수 함수로 옮긴다. 인증 미들웨어(`protectedProcedure`)가 이미
//! userId를 확정했다는 전제라 `Ctx.user_id`는 항상 존재한다 — TS는 `ctx.userId`가
//! `string | null`이라 리졸버가 non-null 좁힘에 의존하지만, 여기선 타입으로 못박는다.
//!
//! 반환은 `Result<_, DomainError>` — TS는 `throw new DomainError`로 제어를 튕기고
//! 미들웨어가 잡아 전송 코드로 바꾼다. Rust는 에러를 반환값 타입에 실어 `?`로 전파한다.

use crate::contract::{
    CreateProjectRequest, CreateTaskRequest, DeleteResponse, ProjectDetailRequest,
    ProjectDetailResponse, ProjectEnvelope, ProjectListResponse, ProjectSummary, SyncChangesRequest,
    SyncChangesResponse, TaskEnvelope, TaskIdRequest, TaskRangeRequest, TaskRangeResponse,
    UpdateTaskRequest,
};
use crate::errors::DomainError;
use crate::ports::{ProjectStore, SyncBroker, TaskStore};
use std::collections::HashMap;

pub struct Ctx {
    pub user_id: String,
}

/// 라우터가 잡는 의존들. TS `TaskRouterDeps`(tasks/projects/sync) 대응.
pub struct TaskRouter<'a, T: TaskStore, P: ProjectStore, S: SyncBroker> {
    pub tasks: &'a T,
    pub projects: &'a P,
    pub sync: &'a S,
}

impl<'a, T: TaskStore, P: ProjectStore, S: SyncBroker> TaskRouter<'a, T, P, S> {
    /// 메인(오늘) 화면 주간 창 데이터 + 동기화 커서.
    pub fn range(&self, ctx: &Ctx, input: TaskRangeRequest) -> Result<TaskRangeResponse, DomainError> {
        Ok(TaskRangeResponse {
            tasks: self.tasks.list_range(&ctx.user_id, &input.from, &input.to),
            projects: self.projects.list_by_user(&ctx.user_id),
            cursor: self.tasks.sync_cursor(&ctx.user_id),
        })
    }

    /// 태스크 상세 — 단건 조회.
    pub fn by_id(&self, ctx: &Ctx, input: TaskIdRequest) -> Result<TaskEnvelope, DomainError> {
        let task = self
            .tasks
            .find_by_id(&ctx.user_id, &input.id)
            .ok_or(DomainError::TaskNotFound)?;
        Ok(TaskEnvelope { task })
    }

    pub fn create(&self, ctx: &Ctx, input: CreateTaskRequest) -> Result<TaskEnvelope, DomainError> {
        if let Some(project_id) = &input.project_id {
            self.projects
                .find_by_id(&ctx.user_id, project_id)
                .ok_or(DomainError::ProjectNotFound)?;
        }
        let task = self.tasks.create(&ctx.user_id, &input);
        self.sync.notify(&ctx.user_id);
        Ok(TaskEnvelope { task })
    }

    /// 의도 기반 부분 업데이트 — patch의 필드만 최신 행에 적용(필드 단위 LWW).
    pub fn update(&self, ctx: &Ctx, input: UpdateTaskRequest) -> Result<TaskEnvelope, DomainError> {
        // TS: `typeof input.patch.projectId === 'string'`. 여기선 3-상태가 타입에 드러나
        // Some(Some(id))(구체 프로젝트로 붙임)만 존재 검증한다 — Some(None)(뗌)은 통과.
        if let Some(Some(project_id)) = &input.patch.project_id {
            self.projects
                .find_by_id(&ctx.user_id, project_id)
                .ok_or(DomainError::ProjectNotFound)?;
        }
        let task = self
            .tasks
            .update(&ctx.user_id, &input.id, &input.patch)
            .ok_or(DomainError::TaskNotFound)?;
        self.sync.notify(&ctx.user_id);
        Ok(TaskEnvelope { task })
    }

    /// 소프트 삭제 — tombstone이 델타로 전파된다.
    pub fn delete(&self, ctx: &Ctx, input: TaskIdRequest) -> Result<DeleteResponse, DomainError> {
        if !self.tasks.remove(&ctx.user_id, &input.id) {
            return Err(DomainError::TaskNotFound);
        }
        self.sync.notify(&ctx.user_id);
        Ok(DeleteResponse { id: input.id })
    }

    /// 델타 동기화 — 커서 이후 변경 전부(tombstone 포함).
    pub fn changes(
        &self,
        ctx: &Ctx,
        input: SyncChangesRequest,
    ) -> Result<SyncChangesResponse, DomainError> {
        let task_changes = self.tasks.changes_since(&ctx.user_id, input.cursor);
        let project_changes = self.projects.changes_since(&ctx.user_id, input.cursor);
        let max_seq = std::iter::once(input.cursor)
            .chain(task_changes.iter().map(|c| c.sync_seq))
            .chain(project_changes.iter().map(|c| c.sync_seq))
            .max()
            .unwrap_or(input.cursor);
        Ok(SyncChangesResponse {
            tasks: task_changes,
            projects: project_changes,
            cursor: max_seq,
        })
    }

    pub fn create_project(
        &self,
        ctx: &Ctx,
        input: CreateProjectRequest,
    ) -> Result<ProjectEnvelope, DomainError> {
        let project = self.projects.create(&ctx.user_id, &input);
        self.sync.notify(&ctx.user_id);
        Ok(ProjectEnvelope { project })
    }

    /// 프로젝트 목록 — 라벨에 진행률(완료/전체)을 붙인다.
    pub fn projects(&self, ctx: &Ctx) -> Result<ProjectListResponse, DomainError> {
        let project_list = self.projects.list_by_user(&ctx.user_id);
        let counts = self.tasks.counts_by_project(&ctx.user_id);
        let count_by_id: HashMap<&str, (u32, u32)> = counts
            .iter()
            .map(|c| (c.project_id.as_str(), (c.total, c.done)))
            .collect();
        let projects = project_list
            .into_iter()
            .map(|project| {
                let (total, done) = count_by_id.get(project.id.as_str()).copied().unwrap_or((0, 0));
                ProjectSummary {
                    project,
                    total_count: total,
                    done_count: done,
                }
            })
            .collect();
        Ok(ProjectListResponse { projects })
    }

    /// 프로젝트 상세(보드) — 라벨과 그 프로젝트의 태스크 전부.
    pub fn project(
        &self,
        ctx: &Ctx,
        input: ProjectDetailRequest,
    ) -> Result<ProjectDetailResponse, DomainError> {
        let project = self
            .projects
            .find_by_id(&ctx.user_id, &input.project_id)
            .ok_or(DomainError::ProjectNotFound)?;
        let tasks = self.tasks.list_by_project(&ctx.user_id, &input.project_id);
        Ok(ProjectDetailResponse { project, tasks })
    }
}
