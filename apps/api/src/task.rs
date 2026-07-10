//! 태스크·프로젝트 데이터 동작 — BFF `modules/task/adapters/sql.ts` 이관.
//!
//! 모든 쓰기는 유저별 sync seq 발급 트랜잭션(sync_seq::begin_user_write) 아래서 실행되고,
//! 업데이트는 의도(intent) 기반 부분 업데이트(필드 단위 LWW — 409 없음),
//! 삭제는 tombstone(soft delete)으로 델타 동기화에 실린다.

use axum::extract::{Path, Query, State};
use axum::Json;
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{json, Value};
use sqlx::postgres::PgRow;
use sqlx::{QueryBuilder, Row};
use uuid::Uuid;

use crate::error::{ApiError, ApiResult};
use crate::ids::new_id;
use crate::ordering::order_key_after;
use crate::state::AppState;
use crate::sync_seq::{begin_user_write, current_sync_seq};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub title: String,
    /// 'YYYY-MM-DD' — 시간대 없는 캘린더 날짜. 문자열 비교가 곧 날짜 비교
    pub date: String,
    /// 'HH:mm'
    pub start_at: String,
    pub duration_min: i32,
    pub status: String,
    pub version: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub color: String,
}

const TASK_COLUMNS: &str = "id, project_id, title, date, start_at, duration_min, status, version";

fn task_from_row(row: &PgRow) -> Result<Task, sqlx::Error> {
    Ok(Task {
        id: row.try_get("id")?,
        project_id: row.try_get("project_id")?,
        title: row.try_get("title")?,
        date: row.try_get("date")?,
        start_at: row.try_get("start_at")?,
        duration_min: row.try_get("duration_min")?,
        status: row.try_get("status")?,
        version: row.try_get("version")?,
    })
}

fn task_change_from_row(row: &PgRow) -> Result<Value, sqlx::Error> {
    let task = task_from_row(row)?;
    let sync_seq: i32 = row.try_get("sync_seq")?;
    let deleted_at: Option<chrono::DateTime<chrono::Utc>> = row.try_get("deleted_at")?;
    let mut value = serde_json::to_value(&task).expect("Task 직렬화는 실패하지 않는다");
    value["syncSeq"] = json!(sync_seq);
    value["deleted"] = json!(deleted_at.is_some());
    Ok(value)
}

fn ordering_error(error: crate::ordering::OrderKeyError) -> ApiError {
    ApiError::Internal(Box::new(error))
}

/// 유저 스코프의 마지막 정렬 키 — 새 행은 맨 뒤에 붙는다
async fn last_position(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>, table: &str, user_id: Uuid) -> ApiResult<Option<String>> {
    // table은 코드 상수("tasks"|"projects")만 — 사용자 입력이 아니다
    let sql = format!("select position from {table} where user_id = $1 order by position desc limit 1");
    Ok(sqlx::query_scalar(&sql).bind(user_id).fetch_optional(&mut **tx).await?)
}

// ── tasks ───────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct RangeParams {
    /// 'YYYY-MM-DD' inclusive
    pub from: String,
    /// 'YYYY-MM-DD' inclusive
    pub to: String,
}

pub async fn list_range(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Query(params): Query<RangeParams>,
) -> ApiResult<Json<Value>> {
    let rows = sqlx::query(&format!(
        "select {TASK_COLUMNS} from tasks
         where user_id = $1 and deleted_at is null and date >= $2 and date <= $3
         order by date, start_at",
    ))
    .bind(user_id)
    .bind(&params.from)
    .bind(&params.to)
    .fetch_all(&state.pool)
    .await?;
    let tasks = rows.iter().map(task_from_row).collect::<Result<Vec<_>, _>>()?;
    Ok(Json(json!({ "tasks": tasks })))
}

pub async fn find_task(
    State(state): State<AppState>,
    Path((user_id, id)): Path<(Uuid, Uuid)>,
) -> ApiResult<Json<Value>> {
    let row = sqlx::query(&format!(
        "select {TASK_COLUMNS} from tasks where user_id = $1 and id = $2 and deleted_at is null",
    ))
    .bind(user_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await?;
    let Some(row) = row else {
        return Err(ApiError::TaskNotFound);
    };
    Ok(Json(json!({ "task": task_from_row(&row)? })))
}

pub async fn list_project_tasks(
    State(state): State<AppState>,
    Path((user_id, project_id)): Path<(Uuid, Uuid)>,
) -> ApiResult<Json<Value>> {
    let rows = sqlx::query(&format!(
        "select {TASK_COLUMNS} from tasks
         where user_id = $1 and project_id = $2 and deleted_at is null
         order by date, start_at",
    ))
    .bind(user_id)
    .bind(project_id)
    .fetch_all(&state.pool)
    .await?;
    let tasks = rows.iter().map(task_from_row).collect::<Result<Vec<_>, _>>()?;
    Ok(Json(json!({ "tasks": tasks })))
}

pub async fn task_counts(State(state): State<AppState>, Path(user_id): Path<Uuid>) -> ApiResult<Json<Value>> {
    let rows: Vec<(Uuid, i64, i64)> = sqlx::query_as(
        "select project_id, count(*) as total, count(*) filter (where status = 'done') as done
         from tasks
         where user_id = $1 and deleted_at is null and project_id is not null
         group by project_id",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;
    let counts: Vec<Value> = rows
        .into_iter()
        .map(|(project_id, total, done)| json!({ "projectId": project_id, "total": total, "done": done }))
        .collect();
    Ok(Json(json!({ "counts": counts })))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskBody {
    pub title: String,
    pub project_id: Option<Uuid>,
    pub date: String,
    pub start_at: String,
    pub duration_min: i32,
}

pub async fn create_task(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(body): Json<CreateTaskBody>,
) -> ApiResult<Json<Value>> {
    let (mut tx, seq) = begin_user_write(&state.pool, user_id).await?;
    let last = last_position(&mut tx, "tasks", user_id).await?;
    let position = order_key_after(last.as_deref()).map_err(ordering_error)?;
    let row = sqlx::query(&format!(
        "insert into tasks (id, user_id, project_id, title, date, start_at, duration_min, status, position, sync_seq, deleted_at, completed_at)
         values ($1, $2, $3, $4, $5, $6, $7, 'todo', $8, $9, null, null)
         returning {TASK_COLUMNS}",
    ))
    .bind(new_id())
    .bind(user_id)
    .bind(body.project_id)
    .bind(&body.title)
    .bind(&body.date)
    .bind(&body.start_at)
    .bind(body.duration_min)
    .bind(&position)
    .bind(seq)
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(Json(json!({ "task": task_from_row(&row)? })))
}

/// missing(변경 없음) / null / 값을 구분하는 tri-state 역직렬화 —
/// `#[serde(default)]`와 함께 쓰면 missing → None, null → Some(None), 값 → Some(Some(v))
fn double_option<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Deserialize::deserialize(deserializer).map(Some)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskPatchBody {
    pub title: Option<String>,
    /// projectId는 null(라벨 떼기)과 미전송(변경 없음)을 구분해야 한다
    #[serde(default, deserialize_with = "double_option")]
    pub project_id: Option<Option<Uuid>>,
    pub date: Option<String>,
    pub start_at: Option<String>,
    pub duration_min: Option<i32>,
    pub status: Option<String>,
}

/// 의도 기반 부분 업데이트 — patch의 필드만 최신 행에 적용한다 (필드 단위 LWW)
pub async fn update_task(
    State(state): State<AppState>,
    Path((user_id, id)): Path<(Uuid, Uuid)>,
    Json(patch): Json<TaskPatchBody>,
) -> ApiResult<Json<Value>> {
    let (mut tx, seq) = begin_user_write(&state.pool, user_id).await?;
    let now = chrono::Utc::now();

    let mut qb = QueryBuilder::new("update tasks set version = version + 1, updated_at = ");
    qb.push_bind(now);
    qb.push(", sync_seq = ");
    qb.push_bind(seq);
    if let Some(title) = &patch.title {
        qb.push(", title = ");
        qb.push_bind(title);
    }
    if let Some(project_id) = &patch.project_id {
        qb.push(", project_id = ");
        qb.push_bind(project_id);
    }
    if let Some(date) = &patch.date {
        qb.push(", date = ");
        qb.push_bind(date);
    }
    if let Some(start_at) = &patch.start_at {
        qb.push(", start_at = ");
        qb.push_bind(start_at);
    }
    if let Some(duration_min) = patch.duration_min {
        qb.push(", duration_min = ");
        qb.push_bind(duration_min);
    }
    if let Some(status) = &patch.status {
        qb.push(", status = ");
        qb.push_bind(status);
        qb.push(", completed_at = ");
        qb.push_bind(if status == "done" { Some(now) } else { None });
    }
    qb.push(" where user_id = ");
    qb.push_bind(user_id);
    qb.push(" and id = ");
    qb.push_bind(id);
    qb.push(" and deleted_at is null returning ");
    qb.push(TASK_COLUMNS);

    let row = qb.build().fetch_optional(&mut *tx).await?;
    let Some(row) = row else {
        return Err(ApiError::TaskNotFound);
    };
    tx.commit().await?;
    Ok(Json(json!({ "task": task_from_row(&row)? })))
}

/// 소프트 삭제 — tombstone이 델타로 다른 기기에 전파된다
pub async fn remove_task(
    State(state): State<AppState>,
    Path((user_id, id)): Path<(Uuid, Uuid)>,
) -> ApiResult<Json<Value>> {
    let (mut tx, seq) = begin_user_write(&state.pool, user_id).await?;
    let now = chrono::Utc::now();
    let removed: Option<(Uuid,)> = sqlx::query_as(
        "update tasks set deleted_at = $1, updated_at = $1, sync_seq = $2
         where user_id = $3 and id = $4 and deleted_at is null
         returning id",
    )
    .bind(now)
    .bind(seq)
    .bind(user_id)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?;
    if removed.is_none() {
        return Err(ApiError::TaskNotFound);
    }
    tx.commit().await?;
    Ok(Json(json!({ "ok": true })))
}

#[derive(Deserialize)]
pub struct ChangesParams {
    /// 마지막으로 본 sync seq — 이 이후의 변경만 내려준다
    pub cursor: i32,
}

pub async fn task_changes(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Query(params): Query<ChangesParams>,
) -> ApiResult<Json<Value>> {
    let rows = sqlx::query(&format!(
        "select {TASK_COLUMNS}, sync_seq, deleted_at from tasks
         where user_id = $1 and sync_seq > $2
         order by sync_seq",
    ))
    .bind(user_id)
    .bind(params.cursor)
    .fetch_all(&state.pool)
    .await?;
    let changes = rows.iter().map(task_change_from_row).collect::<Result<Vec<_>, _>>()?;
    Ok(Json(json!({ "changes": changes })))
}

pub async fn sync_cursor(State(state): State<AppState>, Path(user_id): Path<Uuid>) -> ApiResult<Json<Value>> {
    let cursor = current_sync_seq(&state.pool, user_id).await?;
    Ok(Json(json!({ "cursor": cursor })))
}

// ── projects ────────────────────────────────────────────────────────────────

fn project_from_row(row: &PgRow) -> Result<Project, sqlx::Error> {
    Ok(Project { id: row.try_get("id")?, name: row.try_get("name")?, color: row.try_get("color")? })
}

pub async fn list_projects(State(state): State<AppState>, Path(user_id): Path<Uuid>) -> ApiResult<Json<Value>> {
    let rows = sqlx::query(
        "select id, name, color from projects
         where user_id = $1 and deleted_at is null
         order by position, id",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;
    let projects = rows.iter().map(project_from_row).collect::<Result<Vec<_>, _>>()?;
    Ok(Json(json!({ "projects": projects })))
}

pub async fn find_project(
    State(state): State<AppState>,
    Path((user_id, id)): Path<(Uuid, Uuid)>,
) -> ApiResult<Json<Value>> {
    let row = sqlx::query("select id, name, color from projects where user_id = $1 and id = $2 and deleted_at is null")
        .bind(user_id)
        .bind(id)
        .fetch_optional(&state.pool)
        .await?;
    let Some(row) = row else {
        return Err(ApiError::ProjectNotFound);
    };
    Ok(Json(json!({ "project": project_from_row(&row)? })))
}

#[derive(Deserialize)]
pub struct CreateProjectBody {
    pub name: String,
    pub color: String,
}

pub async fn create_project(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Json(body): Json<CreateProjectBody>,
) -> ApiResult<Json<Value>> {
    let (mut tx, seq) = begin_user_write(&state.pool, user_id).await?;
    let last = last_position(&mut tx, "projects", user_id).await?;
    let position = order_key_after(last.as_deref()).map_err(ordering_error)?;
    let row = sqlx::query(
        "insert into projects (id, user_id, name, color, position, sync_seq, deleted_at)
         values ($1, $2, $3, $4, $5, $6, null)
         returning id, name, color",
    )
    .bind(new_id())
    .bind(user_id)
    .bind(&body.name)
    .bind(&body.color)
    .bind(&position)
    .bind(seq)
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(Json(json!({ "project": project_from_row(&row)? })))
}

pub async fn project_changes(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Query(params): Query<ChangesParams>,
) -> ApiResult<Json<Value>> {
    let rows = sqlx::query(
        "select id, name, color, sync_seq, deleted_at from projects
         where user_id = $1 and sync_seq > $2
         order by sync_seq",
    )
    .bind(user_id)
    .bind(params.cursor)
    .fetch_all(&state.pool)
    .await?;
    let changes = rows
        .iter()
        .map(|row| -> Result<Value, sqlx::Error> {
            let project = project_from_row(row)?;
            let sync_seq: i32 = row.try_get("sync_seq")?;
            let deleted_at: Option<chrono::DateTime<chrono::Utc>> = row.try_get("deleted_at")?;
            let mut value = serde_json::to_value(&project).expect("Project 직렬화는 실패하지 않는다");
            value["syncSeq"] = json!(sync_seq);
            value["deleted"] = json!(deleted_at.is_some());
            Ok(value)
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Json(json!({ "changes": changes })))
}

// `routes` 모듈 경로로 노출 — main.rs 라우터 조립이 `task::routes::*`로 읽히게 한다
pub mod routes {
    pub use super::{
        create_project, create_task, find_project, find_task, list_project_tasks, list_projects, list_range,
        project_changes, remove_task, sync_cursor, task_changes, task_counts, update_task,
    };
}
