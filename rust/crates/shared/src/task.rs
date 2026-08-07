use serde::{Deserialize, Deserializer, Serialize};

use crate::validate::{iso_date, iso_time, min_length, min_value, Issue, IssueKind, Issues, Validate};

pub const TASK_STATUSES: [TaskStatus; 3] = [TaskStatus::Todo, TaskStatus::Doing, TaskStatus::Done];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Todo,
    Doing,
    Done,
}

impl TaskStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            TaskStatus::Todo => "todo",
            TaskStatus::Doing => "doing",
            TaskStatus::Done => "done",
        }
    }

    /// 계약 문자열에서 되돌린다 — [`TaskStatus::as_str`]의 역
    pub fn parse_str(value: &str) -> Option<Self> {
        match value {
            "todo" => Some(TaskStatus::Todo),
            "doing" => Some(TaskStatus::Doing),
            "done" => Some(TaskStatus::Done),
            _ => None,
        }
    }
}

pub const PROJECT_COLORS: [ProjectColor; 6] = [
    ProjectColor::Blue,
    ProjectColor::Mint,
    ProjectColor::Violet,
    ProjectColor::Amber,
    ProjectColor::Pink,
    ProjectColor::Gray,
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProjectColor {
    Blue,
    Mint,
    Violet,
    Amber,
    Pink,
    Gray,
}

impl ProjectColor {
    pub fn as_str(self) -> &'static str {
        match self {
            ProjectColor::Blue => "blue",
            ProjectColor::Mint => "mint",
            ProjectColor::Violet => "violet",
            ProjectColor::Amber => "amber",
            ProjectColor::Pink => "pink",
            ProjectColor::Gray => "gray",
        }
    }

    /// 계약 문자열에서 되돌린다 — [`ProjectColor::as_str`]의 역
    pub fn parse_str(value: &str) -> Option<Self> {
        match value {
            "blue" => Some(ProjectColor::Blue),
            "mint" => Some(ProjectColor::Mint),
            "violet" => Some(ProjectColor::Violet),
            "amber" => Some(ProjectColor::Amber),
            "pink" => Some(ProjectColor::Pink),
            "gray" => Some(ProjectColor::Gray),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: ProjectColor,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    /// 'YYYY-MM-DD' — 시간대 없는 사용자 로컬 캘린더 날짜. 문자열 비교가 곧 날짜 비교다.
    pub date: String,
    /// 'HH:mm'
    pub start_at: String,
    pub duration_min: i64,
    pub status: TaskStatus,
    /// 행 변경 카운터 — 쓰기마다 서버가 +1 (캐시 검증·디버깅용).
    /// 낙관적 잠금이 아니다: 쓰기 요청은 version을 보내지 않고 서버도 비교하지 않는다.
    /// 동시 쓰기 수렴은 필드 단위 LWW([`TaskPatch`] 참고)로 한다 — 409 없음.
    pub version: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskRangeRequest {
    pub from: String,
    pub to: String,
}

impl Validate for TaskRangeRequest {
    fn collect_issues(&self, issues: &mut Issues) {
        iso_date(issues, "from", &self.from);
        iso_date(issues, "to", &self.to);
    }
}

/// 메인(오늘) 화면 한 번의 조회로 주간 창의 태스크·프로젝트 라벨과
/// 동기화 커서(이 유저의 현재 sync seq)를 함께 내려준다.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskRangeResponse {
    pub tasks: Vec<Task>,
    pub projects: Vec<Project>,
    pub cursor: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskRequest {
    pub title: String,
    #[serde(default)]
    pub project_id: Option<String>,
    pub date: String,
    pub start_at: String,
    pub duration_min: i64,
}

impl Validate for CreateTaskRequest {
    fn normalize(&mut self) {
        self.title = self.title.trim().to_owned();
    }

    fn collect_issues(&self, issues: &mut Issues) {
        min_length(issues, "title", &self.title, 1);
        iso_date(issues, "date", &self.date);
        iso_time(issues, "startAt", &self.start_at);
        min_value(issues, "durationMin", self.duration_min, 1);
    }
}

/// 필드가 아예 없었는지(`Absent`)와 명시적 null(`Set(None)`)을 가른다.
/// `taskPatchSchema`의 `v.optional(v.nullable(...))`에 대응한다 — projectId는
/// "안 건드림"과 "프로젝트 해제"가 서로 다른 의도다.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Patch<T> {
    #[default]
    Absent,
    Set(T),
}

impl<T> Patch<T> {
    pub fn is_absent(&self) -> bool {
        matches!(self, Patch::Absent)
    }

    pub fn as_option(&self) -> Option<&T> {
        match self {
            Patch::Absent => None,
            Patch::Set(value) => Some(value),
        }
    }
}

impl<T> Patch<T> {
    fn deserialize_field<'de, D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
        T: Deserialize<'de>,
    {
        T::deserialize(deserializer).map(Patch::Set)
    }
}

impl<T: Serialize> Serialize for Patch<T> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            // `skip_serializing_if`로 걸러지므로 Absent가 여기 오지는 않는다.
            Patch::Absent => serializer.serialize_none(),
            Patch::Set(value) => value.serialize(serializer),
        }
    }
}

/// 의도(intent) 기반 부분 업데이트 — 바꾸려는 필드만 보낸다.
/// 서버는 최신 행에 이 필드들만 적용하므로(필드 단위 LWW) 행 전체 덮어쓰기가 없고,
/// 같은 필드를 두 기기가 고치면 나중 의도가 이긴다. 409는 발생하지 않는다.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskPatch {
    #[serde(
        default,
        deserialize_with = "Patch::deserialize_field",
        skip_serializing_if = "Patch::is_absent"
    )]
    pub title: Patch<String>,
    #[serde(
        default,
        deserialize_with = "Patch::deserialize_field",
        skip_serializing_if = "Patch::is_absent"
    )]
    pub project_id: Patch<Option<String>>,
    #[serde(
        default,
        deserialize_with = "Patch::deserialize_field",
        skip_serializing_if = "Patch::is_absent"
    )]
    pub date: Patch<String>,
    #[serde(
        default,
        deserialize_with = "Patch::deserialize_field",
        skip_serializing_if = "Patch::is_absent"
    )]
    pub start_at: Patch<String>,
    #[serde(
        default,
        deserialize_with = "Patch::deserialize_field",
        skip_serializing_if = "Patch::is_absent"
    )]
    pub duration_min: Patch<i64>,
    #[serde(
        default,
        deserialize_with = "Patch::deserialize_field",
        skip_serializing_if = "Patch::is_absent"
    )]
    pub status: Patch<TaskStatus>,
}

impl TaskPatch {
    /// 지정된 필드가 하나라도 있는가 — `updateTaskRequestSchema`의 `v.check`에 대응
    pub fn has_any_field(&self) -> bool {
        !(self.title.is_absent()
            && self.project_id.is_absent()
            && self.date.is_absent()
            && self.start_at.is_absent()
            && self.duration_min.is_absent()
            && self.status.is_absent())
    }
}

impl Validate for TaskPatch {
    fn normalize(&mut self) {
        if let Patch::Set(title) = &self.title {
            self.title = Patch::Set(title.trim().to_owned());
        }
    }

    fn collect_issues(&self, issues: &mut Issues) {
        if let Patch::Set(title) = &self.title {
            min_length(issues, "title", title, 1);
        }
        if let Patch::Set(date) = &self.date {
            iso_date(issues, "date", date);
        }
        if let Patch::Set(start_at) = &self.start_at {
            iso_time(issues, "startAt", start_at);
        }
        if let Patch::Set(duration_min) = &self.duration_min {
            min_value(issues, "durationMin", *duration_min, 1);
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UpdateTaskRequest {
    pub id: String,
    pub patch: TaskPatch,
}

impl Validate for UpdateTaskRequest {
    fn normalize(&mut self) {
        self.patch.normalize();
    }

    fn collect_issues(&self, issues: &mut Issues) {
        let mut nested = Issues::new();
        self.patch.collect_issues(&mut nested);
        for issue in nested.into_vec() {
            let mut path = vec!["patch".to_owned()];
            path.extend(issue.path);
            issues.push_raw(Issue { kind: issue.kind, path, message: issue.message });
        }
        if !self.patch.has_any_field() {
            issues.push(IssueKind::Check, "patch", "patch에 바꿀 필드가 최소 하나 필요합니다");
        }
    }
}

/// 델타 동기화 — 커서(마지막으로 본 sync seq) 이후 바뀐 행을 전부 내려준다. tombstone 포함
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SyncChangesRequest {
    pub cursor: i64,
}

impl Validate for SyncChangesRequest {
    fn collect_issues(&self, issues: &mut Issues) {
        min_value(issues, "cursor", self.cursor, 0);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskChange {
    #[serde(flatten)]
    pub task: Task,
    pub sync_seq: i64,
    pub deleted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectChange {
    #[serde(flatten)]
    pub project: Project,
    pub sync_seq: i64,
    pub deleted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SyncChangesResponse {
    pub tasks: Vec<TaskChange>,
    pub projects: Vec<ProjectChange>,
    /// 다음 요청에 쓸 커서 — max(요청 커서, 반환된 변경의 최대 seq)
    pub cursor: i64,
}

/// SSE 신호 채널 경로 — 데이터는 싣지 않고 "네 데이터 바뀜"만 알린다.
/// 클라이언트는 신호를 받으면 델타를 당긴다.
pub const SYNC_EVENTS_PATH: &str = "/sync/events";

/// 단건 조회·삭제 요청 — 태스크 id만
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskIdRequest {
    pub id: String,
}

impl Validate for TaskIdRequest {
    fn collect_issues(&self, _issues: &mut Issues) {}
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub color: ProjectColor,
}

impl Validate for CreateProjectRequest {
    fn normalize(&mut self) {
        self.name = self.name.trim().to_owned();
    }

    fn collect_issues(&self, issues: &mut Issues) {
        min_length(issues, "name", &self.name, 1);
    }
}

/// 프로젝트 상세(보드) 요청 — 프로젝트 id
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetailRequest {
    pub project_id: String,
}

impl Validate for ProjectDetailRequest {
    fn collect_issues(&self, _issues: &mut Issues) {}
}

/// 프로젝트 목록 화면용 요약 — 프로젝트 라벨에 진행률(완료/전체 태스크 수)을 얹는다.
/// 카운트는 삭제되지 않은 태스크 기준이며 서버가 집계해 내려준다.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    #[serde(flatten)]
    pub project: Project,
    pub total_count: i64,
    pub done_count: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectListResponse {
    pub projects: Vec<ProjectSummary>,
}

/// 프로젝트 상세 — 프로젝트 라벨과 그 프로젝트에 속한 태스크 전부(상태 무관)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectDetailResponse {
    pub project: Project,
    pub tasks: Vec<Task>,
}

/// `task.byId` 응답 봉투
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskResponse {
    pub task: Task,
}

/// `task.createProject` 응답 봉투
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectResponse {
    pub project: Project,
}

/// `task.delete` 응답 봉투
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeletedTaskResponse {
    pub id: String,
}
