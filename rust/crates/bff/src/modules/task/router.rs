use std::collections::HashMap;
use std::sync::Arc;

use serde_json::Value;
use tooday_shared::{
    CreateProjectRequest, CreateTaskRequest, DeletedTaskResponse, Patch, ProjectDetailRequest,
    ProjectDetailResponse, ProjectListResponse, ProjectResponse, ProjectSummary,
    SyncChangesRequest, SyncChangesResponse, TaskIdRequest, TaskRangeRequest, TaskRangeResponse,
    TaskResponse, UpdateTaskRequest,
};

use crate::modules::task::ports::{
    CreateProjectInput, CreateTaskInput, ListChangesInput, ListTasksByProjectInput,
    ListTasksRangeInput, ProjectStore, TaskRefInput, TaskStore, UpdateTaskInput,
};
use crate::platform::errors::{DomainError, DomainErrorCode};
use crate::platform::sync_broker::SyncBroker;
use crate::trpc::context::TrpcContext;
use crate::trpc::init::{
    output, parse_input, unauthenticated, AuthLevel, Procedure, ProcedureKind, TrpcError,
};

pub const PROCEDURES: &[Procedure] = &[
    Procedure { name: "range", kind: ProcedureKind::Query, auth: AuthLevel::Protected },
    Procedure { name: "byId", kind: ProcedureKind::Query, auth: AuthLevel::Protected },
    Procedure { name: "create", kind: ProcedureKind::Mutation, auth: AuthLevel::Protected },
    Procedure { name: "update", kind: ProcedureKind::Mutation, auth: AuthLevel::Protected },
    Procedure { name: "delete", kind: ProcedureKind::Mutation, auth: AuthLevel::Protected },
    Procedure { name: "changes", kind: ProcedureKind::Query, auth: AuthLevel::Protected },
    Procedure { name: "createProject", kind: ProcedureKind::Mutation, auth: AuthLevel::Protected },
    Procedure { name: "projects", kind: ProcedureKind::Query, auth: AuthLevel::Protected },
    Procedure { name: "project", kind: ProcedureKind::Query, auth: AuthLevel::Protected },
];

pub struct TaskRouterDeps {
    pub tasks: Arc<dyn TaskStore>,
    pub projects: Arc<dyn ProjectStore>,
    pub sync: Arc<dyn SyncBroker>,
}

fn project_not_found() -> TrpcError {
    DomainError::new(DomainErrorCode::ProjectNotFound).into()
}

fn task_not_found() -> TrpcError {
    DomainError::new(DomainErrorCode::TaskNotFound).into()
}

pub async fn call(
    deps: &TaskRouterDeps,
    ctx: &mut TrpcContext,
    name: &str,
    input: Option<Value>,
) -> Result<Value, TrpcError> {
    let user_id = ctx.user_id.clone().ok_or_else(unauthenticated)?;

    match name {
        // 메인(오늘) 화면 주간 창 데이터 + 동기화 커서
        "range" => {
            let request: TaskRangeRequest = parse_input(input)?;
            let (tasks, projects, cursor) = futures::try_join!(
                deps.tasks.list_range(ListTasksRangeInput {
                    user_id: user_id.clone(),
                    from: request.from,
                    to: request.to,
                }),
                deps.projects.list_by_user(&user_id),
                deps.tasks.sync_cursor(&user_id),
            )?;
            output(TaskRangeResponse { tasks, projects, cursor })
        }

        // 태스크 상세 화면 — 단건 조회
        "byId" => {
            let request: TaskIdRequest = parse_input(input)?;
            let task = deps
                .tasks
                .find_by_id(&TaskRefInput { user_id, id: request.id })
                .await?
                .ok_or_else(task_not_found)?;
            output(TaskResponse { task })
        }

        "create" => {
            let request: CreateTaskRequest = parse_input(input)?;
            if let Some(project_id) = &request.project_id {
                let project = deps
                    .projects
                    .find_by_id(&TaskRefInput { user_id: user_id.clone(), id: project_id.clone() })
                    .await?;
                if project.is_none() {
                    return Err(project_not_found());
                }
            }
            let task = deps
                .tasks
                .create(CreateTaskInput {
                    user_id: user_id.clone(),
                    title: request.title,
                    project_id: request.project_id,
                    date: request.date,
                    start_at: request.start_at,
                    duration_min: request.duration_min,
                })
                .await?;
            deps.sync.notify(&user_id);
            output(TaskResponse { task })
        }

        // 의도 기반 부분 업데이트 — patch의 필드만 최신 행에 적용한다.
        // 같은 필드의 경합은 나중 의도가 이기고(LWW), 다른 필드끼리는 충돌하지 않는다.
        "update" => {
            let request: UpdateTaskRequest = parse_input(input)?;
            if let Patch::Set(Some(project_id)) = &request.patch.project_id {
                let project = deps
                    .projects
                    .find_by_id(&TaskRefInput { user_id: user_id.clone(), id: project_id.clone() })
                    .await?;
                if project.is_none() {
                    return Err(project_not_found());
                }
            }
            let task = deps
                .tasks
                .update(UpdateTaskInput {
                    user_id: user_id.clone(),
                    id: request.id,
                    patch: request.patch,
                })
                .await?
                .ok_or_else(task_not_found)?;
            deps.sync.notify(&user_id);
            output(TaskResponse { task })
        }

        // 소프트 삭제 — tombstone이 델타로 다른 기기에 전파된다
        "delete" => {
            let request: TaskIdRequest = parse_input(input)?;
            let removed = deps
                .tasks
                .remove(&TaskRefInput { user_id: user_id.clone(), id: request.id.clone() })
                .await?;
            if !removed {
                return Err(task_not_found());
            }
            deps.sync.notify(&user_id);
            output(DeletedTaskResponse { id: request.id })
        }

        // 델타 동기화 — 커서 이후의 변경 전부 (tombstone 포함)
        "changes" => {
            let request: SyncChangesRequest = parse_input(input)?;
            let (tasks, projects) = futures::try_join!(
                deps.tasks.changes_since(ListChangesInput {
                    user_id: user_id.clone(),
                    cursor: request.cursor,
                }),
                deps.projects.changes_since(ListChangesInput {
                    user_id: user_id.clone(),
                    cursor: request.cursor,
                }),
            )?;
            let cursor = tasks
                .iter()
                .map(|change| change.sync_seq)
                .chain(projects.iter().map(|change| change.sync_seq))
                .fold(request.cursor, i64::max);
            output(SyncChangesResponse { tasks, projects, cursor })
        }

        "createProject" => {
            let request: CreateProjectRequest = parse_input(input)?;
            let project = deps
                .projects
                .create(CreateProjectInput {
                    user_id: user_id.clone(),
                    name: request.name,
                    color: request.color,
                })
                .await?;
            deps.sync.notify(&user_id);
            output(ProjectResponse { project })
        }

        // 프로젝트 목록 화면 — 프로젝트 라벨에 진행률(완료/전체)을 붙여 내려준다
        "projects" => {
            let (projects, counts) = futures::try_join!(
                deps.projects.list_by_user(&user_id),
                deps.tasks.counts_by_project(&user_id),
            )?;
            let count_by_id: HashMap<&str, &_> =
                counts.iter().map(|count| (count.project_id.as_str(), count)).collect();
            output(ProjectListResponse {
                projects: projects
                    .into_iter()
                    .map(|project| {
                        let count = count_by_id.get(project.id.as_str());
                        ProjectSummary {
                            total_count: count.map(|count| count.total).unwrap_or(0),
                            done_count: count.map(|count| count.done).unwrap_or(0),
                            project,
                        }
                    })
                    .collect(),
            })
        }

        // 프로젝트 상세(보드) — 프로젝트 라벨과 그 프로젝트의 태스크 전부
        "project" => {
            let request: ProjectDetailRequest = parse_input(input)?;
            let project = deps
                .projects
                .find_by_id(&TaskRefInput {
                    user_id: user_id.clone(),
                    id: request.project_id.clone(),
                })
                .await?
                .ok_or_else(project_not_found)?;
            let tasks = deps
                .tasks
                .list_by_project(ListTasksByProjectInput {
                    user_id,
                    project_id: request.project_id,
                })
                .await?;
            output(ProjectDetailResponse { project, tasks })
        }

        _ => unreachable!("디스패처가 존재하는 프로시저만 넘긴다"),
    }
}
