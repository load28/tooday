use async_trait::async_trait;
use chrono::Utc;
use sqlx::postgres::PgRow;
use sqlx::{PgPool, Row};
use tooday_shared::{
    Patch, Project, ProjectChange, ProjectColor, Task, TaskChange, TaskStatus,
};

use crate::modules::task::ports::{
    CreateProjectInput, CreateTaskInput, ListChangesInput, ListTasksByProjectInput,
    ListTasksRangeInput, ProjectStore, ProjectTaskCounts, TaskRefInput, TaskStore, UpdateTaskInput,
};
use crate::platform::db::sync::{begin_with_sync_seq, current_sync_seq};
use crate::platform::errors::{StoreError, StoreResult};
use crate::platform::ids::new_id;
use crate::platform::ordering::order_key_after;

const TASK_COLUMNS: &str = "id, project_id, title, date, start_at, duration_min, status, version";

fn to_task(row: &PgRow) -> StoreResult<Task> {
    let status: String = row.try_get("status").map_err(StoreError::infrastructure)?;
    let project_id: Option<uuid::Uuid> = row.try_get("project_id").map_err(StoreError::infrastructure)?;
    Ok(Task {
        id: row.try_get::<uuid::Uuid, _>("id").map_err(StoreError::infrastructure)?.to_string(),
        project_id: project_id.map(|id| id.to_string()),
        title: row.try_get("title").map_err(StoreError::infrastructure)?,
        date: row.try_get("date").map_err(StoreError::infrastructure)?,
        start_at: row.try_get("start_at").map_err(StoreError::infrastructure)?,
        duration_min: row.try_get::<i32, _>("duration_min").map_err(StoreError::infrastructure)? as i64,
        status: TaskStatus::from_str(&status)
            .ok_or_else(|| StoreError::Infrastructure(format!("알 수 없는 status: {status}")))?,
        version: row.try_get::<i32, _>("version").map_err(StoreError::infrastructure)? as i64,
    })
}

fn to_project(row: &PgRow) -> StoreResult<Project> {
    let color: String = row.try_get("color").map_err(StoreError::infrastructure)?;
    Ok(Project {
        id: row.try_get::<uuid::Uuid, _>("id").map_err(StoreError::infrastructure)?.to_string(),
        name: row.try_get("name").map_err(StoreError::infrastructure)?,
        color: ProjectColor::from_str(&color)
            .ok_or_else(|| StoreError::Infrastructure(format!("알 수 없는 color: {color}")))?,
    })
}

pub struct SqlProjectStore {
    pool: PgPool,
}

impl SqlProjectStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ProjectStore for SqlProjectStore {
    async fn list_by_user(&self, user_id: &str) -> StoreResult<Vec<Project>> {
        let rows = sqlx::query(
            r#"select id, name, color from projects
               where user_id = $1::uuid and deleted_at is null
               order by position, id"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;
        rows.iter().map(to_project).collect()
    }

    async fn find_by_id(&self, input: &TaskRefInput) -> StoreResult<Option<Project>> {
        let row = sqlx::query(
            r#"select id, name, color from projects
               where user_id = $1::uuid and id = $2::uuid and deleted_at is null"#,
        )
        .bind(&input.user_id)
        .bind(&input.id)
        .fetch_optional(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;
        row.as_ref().map(to_project).transpose()
    }

    async fn create(&self, input: CreateProjectInput) -> StoreResult<Project> {
        let (mut tx, seq) = begin_with_sync_seq(&self.pool, &input.user_id)
            .await
            .map_err(StoreError::infrastructure)?;
        let last: Option<(String,)> = sqlx::query_as(
            "select position from projects where user_id = $1::uuid order by position desc limit 1",
        )
        .bind(&input.user_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(StoreError::infrastructure)?;

        let project = Project { id: new_id(), name: input.name, color: input.color };
        sqlx::query(
            r#"insert into projects (id, user_id, name, color, position, sync_seq, deleted_at)
               values ($1::uuid, $2::uuid, $3, $4, $5, $6, null)"#,
        )
        .bind(&project.id)
        .bind(&input.user_id)
        .bind(&project.name)
        .bind(project.color.as_str())
        .bind(order_key_after(last.map(|(position,)| position).as_deref()))
        .bind(seq as i32)
        .execute(&mut *tx)
        .await
        .map_err(StoreError::infrastructure)?;
        tx.commit().await.map_err(StoreError::infrastructure)?;
        Ok(project)
    }

    async fn changes_since(&self, input: ListChangesInput) -> StoreResult<Vec<ProjectChange>> {
        let rows = sqlx::query(
            r#"select id, name, color, sync_seq, deleted_at from projects
               where user_id = $1::uuid and sync_seq > $2
               order by sync_seq"#,
        )
        .bind(&input.user_id)
        .bind(input.cursor as i32)
        .fetch_all(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;

        rows.iter()
            .map(|row| {
                let deleted_at: Option<chrono::DateTime<Utc>> =
                    row.try_get("deleted_at").map_err(StoreError::infrastructure)?;
                Ok(ProjectChange {
                    project: to_project(row)?,
                    sync_seq: row.try_get::<i32, _>("sync_seq").map_err(StoreError::infrastructure)? as i64,
                    deleted: deleted_at.is_some(),
                })
            })
            .collect()
    }
}

pub struct SqlTaskStore {
    pool: PgPool,
}

impl SqlTaskStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TaskStore for SqlTaskStore {
    async fn list_range(&self, input: ListTasksRangeInput) -> StoreResult<Vec<Task>> {
        let rows = sqlx::query(&format!(
            r#"select {TASK_COLUMNS} from tasks
               where user_id = $1::uuid and deleted_at is null and date >= $2 and date <= $3
               order by date, start_at"#
        ))
        .bind(&input.user_id)
        .bind(&input.from)
        .bind(&input.to)
        .fetch_all(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;
        rows.iter().map(to_task).collect()
    }

    async fn find_by_id(&self, input: &TaskRefInput) -> StoreResult<Option<Task>> {
        let row = sqlx::query(&format!(
            r#"select {TASK_COLUMNS} from tasks
               where user_id = $1::uuid and id = $2::uuid and deleted_at is null"#
        ))
        .bind(&input.user_id)
        .bind(&input.id)
        .fetch_optional(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;
        row.as_ref().map(to_task).transpose()
    }

    async fn list_by_project(&self, input: ListTasksByProjectInput) -> StoreResult<Vec<Task>> {
        let rows = sqlx::query(&format!(
            r#"select {TASK_COLUMNS} from tasks
               where user_id = $1::uuid and project_id = $2::uuid and deleted_at is null
               order by date, start_at"#
        ))
        .bind(&input.user_id)
        .bind(&input.project_id)
        .fetch_all(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;
        rows.iter().map(to_task).collect()
    }

    async fn counts_by_project(&self, user_id: &str) -> StoreResult<Vec<ProjectTaskCounts>> {
        // COUNT은 NULL을 세지 않으므로 done 행만 1로 남겨 센다
        let rows: Vec<(uuid::Uuid, i64, i64)> = sqlx::query_as(
            r#"select project_id, count(*) as total,
                      count(case when status = 'done' then 1 end) as done
               from tasks
               where user_id = $1::uuid and deleted_at is null and project_id is not null
               group by project_id"#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;
        Ok(rows
            .into_iter()
            .map(|(project_id, total, done)| ProjectTaskCounts {
                project_id: project_id.to_string(),
                total,
                done,
            })
            .collect())
    }

    async fn create(&self, input: CreateTaskInput) -> StoreResult<Task> {
        let (mut tx, seq) = begin_with_sync_seq(&self.pool, &input.user_id)
            .await
            .map_err(StoreError::infrastructure)?;
        let last: Option<(String,)> = sqlx::query_as(
            "select position from tasks where user_id = $1::uuid order by position desc limit 1",
        )
        .bind(&input.user_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(StoreError::infrastructure)?;

        let row = sqlx::query(&format!(
            r#"insert into tasks
               (id, user_id, project_id, title, date, start_at, duration_min, status, position,
                sync_seq, deleted_at, completed_at)
               values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, 'todo', $8, $9, null, null)
               returning {TASK_COLUMNS}"#
        ))
        .bind(new_id())
        .bind(&input.user_id)
        .bind(&input.project_id)
        .bind(&input.title)
        .bind(&input.date)
        .bind(&input.start_at)
        .bind(input.duration_min as i32)
        .bind(order_key_after(last.map(|(position,)| position).as_deref()))
        .bind(seq as i32)
        .fetch_one(&mut *tx)
        .await
        .map_err(StoreError::infrastructure)?;
        let task = to_task(&row)?;
        tx.commit().await.map_err(StoreError::infrastructure)?;
        Ok(task)
    }

    async fn update(&self, input: UpdateTaskInput) -> StoreResult<Option<Task>> {
        let (mut tx, seq) = begin_with_sync_seq(&self.pool, &input.user_id)
            .await
            .map_err(StoreError::infrastructure)?;
        let now = Utc::now();

        // 지정된 필드만 SET 절에 넣는다 — 필드 단위 LWW라 행 전체 덮어쓰기가 없다.
        // 자리표시자 번호는 아래 bind 순서와 같은 순서로 매긴다.
        let mut columns: Vec<&str> = Vec::new();
        if !input.patch.title.is_absent() {
            columns.push("title");
        }
        if !input.patch.project_id.is_absent() {
            columns.push("project_id");
        }
        if !input.patch.date.is_absent() {
            columns.push("date");
        }
        if !input.patch.start_at.is_absent() {
            columns.push("start_at");
        }
        if !input.patch.duration_min.is_absent() {
            columns.push("duration_min");
        }
        if !input.patch.status.is_absent() {
            // 완료 시각은 상태에 종속된다 — done이면 지금, 아니면 해제
            columns.push("status");
            columns.push("completed_at");
        }
        let assignments: Vec<String> = columns
            .iter()
            .enumerate()
            .map(|(index, column)| format!("{column} = ${}", index + 1))
            .collect();

        let seq_placeholder = columns.len() + 1;
        let updated_at_placeholder = columns.len() + 2;
        let user_placeholder = columns.len() + 3;
        let id_placeholder = columns.len() + 4;

        let sql = format!(
            r#"update tasks set {}{}version = version + 1,
                   updated_at = ${updated_at_placeholder}, sync_seq = ${seq_placeholder}
               where user_id = ${user_placeholder}::uuid and id = ${id_placeholder}::uuid
                 and deleted_at is null
               returning {TASK_COLUMNS}"#,
            assignments.join(", "),
            if assignments.is_empty() { "" } else { ", " },
        );

        let mut query = sqlx::query(&sql);
        if let Patch::Set(title) = &input.patch.title {
            query = query.bind(title);
        }
        if let Patch::Set(project_id) = &input.patch.project_id {
            query = query.bind(project_id.as_ref().and_then(|id| id.parse::<uuid::Uuid>().ok()));
        }
        if let Patch::Set(date) = &input.patch.date {
            query = query.bind(date);
        }
        if let Patch::Set(start_at) = &input.patch.start_at {
            query = query.bind(start_at);
        }
        if let Patch::Set(duration_min) = &input.patch.duration_min {
            query = query.bind(*duration_min as i32);
        }
        if let Patch::Set(status) = &input.patch.status {
            query = query.bind(status.as_str());
            query = query.bind((*status == TaskStatus::Done).then_some(now));
        }
        query = query.bind(seq as i32).bind(now).bind(&input.user_id).bind(&input.id);

        let row = query.fetch_optional(&mut *tx).await.map_err(StoreError::infrastructure)?;
        let task = row.as_ref().map(to_task).transpose()?;
        tx.commit().await.map_err(StoreError::infrastructure)?;
        Ok(task)
    }

    async fn remove(&self, input: &TaskRefInput) -> StoreResult<bool> {
        let (mut tx, seq) = begin_with_sync_seq(&self.pool, &input.user_id)
            .await
            .map_err(StoreError::infrastructure)?;
        let now = Utc::now();
        let row: Option<(uuid::Uuid,)> = sqlx::query_as(
            r#"update tasks set deleted_at = $1, updated_at = $1, sync_seq = $2
               where user_id = $3::uuid and id = $4::uuid and deleted_at is null
               returning id"#,
        )
        .bind(now)
        .bind(seq as i32)
        .bind(&input.user_id)
        .bind(&input.id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(StoreError::infrastructure)?;
        tx.commit().await.map_err(StoreError::infrastructure)?;
        Ok(row.is_some())
    }

    async fn changes_since(&self, input: ListChangesInput) -> StoreResult<Vec<TaskChange>> {
        let rows = sqlx::query(&format!(
            r#"select {TASK_COLUMNS}, sync_seq, deleted_at from tasks
               where user_id = $1::uuid and sync_seq > $2
               order by sync_seq"#
        ))
        .bind(&input.user_id)
        .bind(input.cursor as i32)
        .fetch_all(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;

        rows.iter()
            .map(|row| {
                let deleted_at: Option<chrono::DateTime<Utc>> =
                    row.try_get("deleted_at").map_err(StoreError::infrastructure)?;
                Ok(TaskChange {
                    task: to_task(row)?,
                    sync_seq: row.try_get::<i32, _>("sync_seq").map_err(StoreError::infrastructure)? as i64,
                    deleted: deleted_at.is_some(),
                })
            })
            .collect()
    }

    async fn sync_cursor(&self, user_id: &str) -> StoreResult<i64> {
        current_sync_seq(&self.pool, user_id).await.map_err(StoreError::infrastructure)
    }
}
