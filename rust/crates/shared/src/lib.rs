//! 웹 ↔ BFF 계약만 둔다 — 도메인별 모듈(auth, user, pub, task) + api.
//!
//! TS의 `packages/shared`와 1:1 대응한다. 계약을 한 곳에 선언하고 타입이 정확히
//! 추론되게 설계해 어긋남을 컴파일 타임에 잡는다.

pub mod api;
pub mod auth;
pub mod pub_config;
pub mod task;
pub mod user;
pub mod validate;

pub use api::{ApiError, ApiErrorBody, TRPC_ENDPOINT};
pub use auth::{
    AuthResponse, LoginRequest, LogoutResponse, RefreshRequest, RefreshResponse, SignupRequest, TokenPair,
    MIN_PASSWORD_LENGTH,
};
pub use pub_config::{AppConfigResponse, AppFeatures};
pub use task::{
    CreateProjectRequest, CreateTaskRequest, DeletedTaskResponse, Patch, Project, ProjectChange,
    ProjectColor, ProjectDetailRequest, ProjectDetailResponse, ProjectListResponse, ProjectResponse,
    ProjectSummary, SyncChangesRequest, SyncChangesResponse, Task, TaskChange, TaskIdRequest, TaskPatch,
    TaskRangeRequest, TaskRangeResponse, TaskResponse, TaskStatus, UpdateTaskRequest, PROJECT_COLORS,
    SYNC_EVENTS_PATH, TASK_STATUSES,
};
pub use user::{MeResponse, User};
pub use validate::{Issue, IssueKind, Validate, ValidationError};
