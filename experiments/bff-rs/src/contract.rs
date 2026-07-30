//! web <-> bff 계약. `packages/shared/src/task.ts`의 valibot 스키마 포팅.
//!
//! valibot은 스키마 하나에서 런타임 검증과 `v.InferOutput` 타입을 동시에 뽑는다.
//! Rust엔 "값에서 타입을 유도"하는 장치가 없으므로, 검증은 **타입(뉴타입)에** 붙이고
//! serde `try_from`으로 디코드 시점에 강제한다. 즉 valibot의 `pipe(string, isoDate)`가
//! 여기선 `IsoDate` 뉴타입 하나로 응결되어 어디서 쓰든 검증이 따라온다.

use serde::{Deserialize, Serialize};
use std::fmt;

/// 계약 검증 실패. valibot의 이슈에 대응한다.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContractError(pub String);

impl fmt::Display for ContractError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}
impl std::error::Error for ContractError {}

// ── 검증 뉴타입 ────────────────────────────────────────────────────────────
// serde `try_from`은 먼저 원시 타입으로 디코드한 뒤 `TryFrom`으로 검증한다.
// 뉴타입에 대한 derive(Serialize)는 내부 값 그대로(투명하게) 직렬화된다.

/// 'YYYY-MM-DD' — 시간대 없는 로컬 캘린더 날짜. 문자열 비교가 곧 날짜 비교.
/// valibot `pipe(string, isoDate)` 대응.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(try_from = "String")]
pub struct IsoDate(String);

impl IsoDate {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}
impl TryFrom<String> for IsoDate {
    type Error = ContractError;
    fn try_from(s: String) -> Result<Self, Self::Error> {
        let b = s.as_bytes();
        let ok = b.len() == 10
            && b[4] == b'-'
            && b[7] == b'-'
            && b[..4].iter().all(u8::is_ascii_digit)
            && b[5..7].iter().all(u8::is_ascii_digit)
            && b[8..].iter().all(u8::is_ascii_digit);
        if ok {
            Ok(IsoDate(s))
        } else {
            Err(ContractError(format!("invalid ISO date: {s:?}")))
        }
    }
}

/// 'HH:mm'. valibot `pipe(string, isoTime)` 대응.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(try_from = "String")]
pub struct IsoTime(String);

impl IsoTime {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}
impl TryFrom<String> for IsoTime {
    type Error = ContractError;
    fn try_from(s: String) -> Result<Self, Self::Error> {
        let b = s.as_bytes();
        let ok = b.len() == 5
            && b[2] == b':'
            && b[..2].iter().all(u8::is_ascii_digit)
            && b[3..].iter().all(u8::is_ascii_digit)
            && b[..2] <= b"23"[..]
            && b[3..] <= b"59"[..];
        if ok {
            Ok(IsoTime(s))
        } else {
            Err(ContractError(format!("invalid ISO time: {s:?}")))
        }
    }
}

/// trim 후 1자 이상. valibot `pipe(string, trim, minLength(1))` 대응.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "String")]
pub struct NonEmptyText(String);

impl NonEmptyText {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}
impl TryFrom<String> for NonEmptyText {
    type Error = ContractError;
    fn try_from(s: String) -> Result<Self, Self::Error> {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            Err(ContractError("text must be non-empty".into()))
        } else {
            Ok(NonEmptyText(trimmed.to_string()))
        }
    }
}

/// 1 이상 정수. valibot `pipe(number, integer, minValue(1))` 대응.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "i64")]
pub struct DurationMin(u32);

impl DurationMin {
    pub fn get(self) -> u32 {
        self.0
    }
}
impl TryFrom<i64> for DurationMin {
    type Error = ContractError;
    fn try_from(n: i64) -> Result<Self, Self::Error> {
        if n >= 1 {
            Ok(DurationMin(n as u32))
        } else {
            Err(ContractError(format!("durationMin must be >= 1, got {n}")))
        }
    }
}

// ── 열거형 ──────────────────────────────────────────────────────────────────
// valibot `picklist([...] as const)` 대응. Rust는 명목적 enum이라 값 집합이
// 곧 타입이고, 매칭이 exhaustive하다(아래 router/errors에서 활용).

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Todo,
    Doing,
    Done,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProjectColor {
    Blue,
    Mint,
    Violet,
    Amber,
    Pink,
    Gray,
}

// ── 도메인 모델 ─────────────────────────────────────────────────────────────
// TS 계약이 camelCase라 `rename_all`로 맞춘다(valibot은 키를 그대로 쓰므로 무설정).

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub date: IsoDate,
    pub start_at: IsoTime,
    pub duration_min: DurationMin,
    pub status: TaskStatus,
    /// 행 변경 카운터 — 쓰기마다 서버가 +1. 낙관적 잠금 아님(LWW).
    pub version: u32,
}

// ── 요청 ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRangeRequest {
    pub from: IsoDate,
    pub to: IsoDate,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskRequest {
    pub title: NonEmptyText,
    /// valibot `optional(nullable(string), null)` — 부재 시 null로 채움.
    #[serde(default)]
    pub project_id: Option<String>,
    pub date: IsoDate,
    pub start_at: IsoTime,
    pub duration_min: DurationMin,
}

/// 의도 기반 부분 업데이트. 각 필드는 "보냈나?"를 `Option`으로 나타낸다.
///
/// 핵심 대비: `projectId`는 valibot `optional(nullable(string))`이라 **3-상태**다 —
/// 부재(안 바꿈)/null(프로젝트에서 뗌)/문자열(붙임). Rust에선 `Option<Option<String>>`로
/// 충실히 표현하되, serde 기본은 `null`과 부재를 둘 다 바깥 `None`으로 뭉개므로
/// `double_option`으로 갈라준다. TS에선 `projectId?: string | null` 한 줄이지만
/// 대신 세 상태가 타입에 안 드러난다(부재와 null이 겹침).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskPatch {
    #[serde(default)]
    pub title: Option<NonEmptyText>,
    #[serde(default, deserialize_with = "double_option")]
    pub project_id: Option<Option<String>>,
    #[serde(default)]
    pub date: Option<IsoDate>,
    #[serde(default)]
    pub start_at: Option<IsoTime>,
    #[serde(default)]
    pub duration_min: Option<DurationMin>,
    #[serde(default)]
    pub status: Option<TaskStatus>,
}

impl TaskPatch {
    /// valibot `check(...)` 대응 — 바꿀 필드가 최소 하나여야 한다.
    pub fn is_empty(&self) -> bool {
        self.title.is_none()
            && self.project_id.is_none()
            && self.date.is_none()
            && self.start_at.is_none()
            && self.duration_min.is_none()
            && self.status.is_none()
    }
}

/// `null`을 안쪽 `None`으로, 부재를 바깥 `None`으로 가르는 serde 헬퍼.
/// (serde 기본 `Option`은 둘을 구분하지 못한다.)
fn double_option<'de, T, D>(de: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    Deserialize::deserialize(de).map(Some)
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskRequest {
    pub id: String,
    pub patch: TaskPatch,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncChangesRequest {
    pub cursor: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskIdRequest {
    pub id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectRequest {
    pub name: NonEmptyText,
    pub color: ProjectColor,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetailRequest {
    pub project_id: String,
}

// ── 응답 ────────────────────────────────────────────────────────────────────
// `...taskSchema.entries` 스프레드는 serde `flatten`으로. 부모 필드를 평평하게 편다.

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskChange {
    #[serde(flatten)]
    pub task: Task,
    pub sync_seq: u64,
    pub deleted: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectChange {
    #[serde(flatten)]
    pub project: Project,
    pub sync_seq: u64,
    pub deleted: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    #[serde(flatten)]
    pub project: Project,
    pub total_count: u32,
    pub done_count: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRangeResponse {
    pub tasks: Vec<Task>,
    pub projects: Vec<Project>,
    pub cursor: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskEnvelope {
    pub task: Task,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectEnvelope {
    pub project: Project,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeleteResponse {
    pub id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncChangesResponse {
    pub tasks: Vec<TaskChange>,
    pub projects: Vec<ProjectChange>,
    pub cursor: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectListResponse {
    pub projects: Vec<ProjectSummary>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetailResponse {
    pub project: Project,
    pub tasks: Vec<Task>,
}
