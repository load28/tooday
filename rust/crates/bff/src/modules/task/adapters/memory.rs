use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use tooday_shared::{Patch, Project, ProjectChange, Task, TaskChange, TaskStatus};

use crate::modules::task::ports::{
    CreateProjectInput, CreateTaskInput, ListChangesInput, ListTasksByProjectInput,
    ListTasksRangeInput, ProjectStore, ProjectTaskCounts, TaskRefInput, TaskStore, UpdateTaskInput,
};
use crate::platform::errors::StoreResult;
use crate::platform::ids::new_id;
use crate::platform::ordering::order_key_after;

/// 유저별 단조증가 seq — SQL 구현의 sync_counters에 대응.
/// 두 스토어가 하나를 공유해야 한다.
#[derive(Default)]
pub struct InMemorySyncCounter {
    seqs: Mutex<HashMap<String, i64>>,
}

impl InMemorySyncCounter {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    pub fn next(&self, user_id: &str) -> i64 {
        let mut seqs = self.seqs.lock().expect("sync counter mutex");
        let next = seqs.get(user_id).copied().unwrap_or(0) + 1;
        seqs.insert(user_id.to_owned(), next);
        next
    }

    pub fn current(&self, user_id: &str) -> i64 {
        self.seqs.lock().expect("sync counter mutex").get(user_id).copied().unwrap_or(0)
    }
}

#[derive(Debug, Clone)]
struct ProjectRecord {
    project: Project,
    user_id: String,
    position: String,
    sync_seq: i64,
    deleted: bool,
}

#[derive(Debug, Clone)]
struct TaskRecord {
    task: Task,
    user_id: String,
    position: String,
    sync_seq: i64,
    deleted: bool,
}

/// 같은 position이면 id로 가른다 — SQL의 `order by position, id`와 같은 전순서
fn by_position<'a>(a: (&'a str, &'a str), b: (&'a str, &'a str)) -> std::cmp::Ordering {
    a.0.cmp(b.0).then_with(|| a.1.cmp(b.1))
}

/// 날짜 → 시작 시각 순 — SQL의 `order by date, start_at`과 같다
fn by_schedule(a: &Task, b: &Task) -> std::cmp::Ordering {
    a.date.cmp(&b.date).then_with(|| a.start_at.cmp(&b.start_at))
}

pub struct InMemoryProjectStore {
    by_id: Mutex<HashMap<String, ProjectRecord>>,
    counter: Arc<InMemorySyncCounter>,
}

impl InMemoryProjectStore {
    pub fn new(counter: Arc<InMemorySyncCounter>) -> Self {
        Self { by_id: Mutex::new(HashMap::new()), counter }
    }

    fn last_position(records: &HashMap<String, ProjectRecord>, user_id: &str) -> Option<String> {
        records
            .values()
            .filter(|record| record.user_id == user_id)
            .map(|record| record.position.clone())
            .max()
    }
}

#[async_trait]
impl ProjectStore for InMemoryProjectStore {
    async fn list_by_user(&self, user_id: &str) -> StoreResult<Vec<Project>> {
        let records = self.by_id.lock().expect("project store mutex");
        let mut visible: Vec<&ProjectRecord> = records
            .values()
            .filter(|record| record.user_id == user_id && !record.deleted)
            .collect();
        visible.sort_by(|a, b| {
            by_position((&a.position, &a.project.id), (&b.position, &b.project.id))
        });
        Ok(visible.into_iter().map(|record| record.project.clone()).collect())
    }

    async fn find_by_id(&self, input: &TaskRefInput) -> StoreResult<Option<Project>> {
        let records = self.by_id.lock().expect("project store mutex");
        Ok(records
            .get(&input.id)
            .filter(|record| record.user_id == input.user_id && !record.deleted)
            .map(|record| record.project.clone()))
    }

    async fn create(&self, input: CreateProjectInput) -> StoreResult<Project> {
        let mut records = self.by_id.lock().expect("project store mutex");
        let position = order_key_after(Self::last_position(&records, &input.user_id).as_deref());
        let record = ProjectRecord {
            project: Project { id: new_id(), name: input.name, color: input.color },
            user_id: input.user_id.clone(),
            position,
            sync_seq: self.counter.next(&input.user_id),
            deleted: false,
        };
        records.insert(record.project.id.clone(), record.clone());
        Ok(record.project)
    }

    async fn changes_since(&self, input: ListChangesInput) -> StoreResult<Vec<ProjectChange>> {
        let records = self.by_id.lock().expect("project store mutex");
        let mut changed: Vec<&ProjectRecord> = records
            .values()
            .filter(|record| record.user_id == input.user_id && record.sync_seq > input.cursor)
            .collect();
        changed.sort_by_key(|record| record.sync_seq);
        Ok(changed
            .into_iter()
            .map(|record| ProjectChange {
                project: record.project.clone(),
                sync_seq: record.sync_seq,
                deleted: record.deleted,
            })
            .collect())
    }
}

pub struct InMemoryTaskStore {
    by_id: Mutex<HashMap<String, TaskRecord>>,
    counter: Arc<InMemorySyncCounter>,
}

impl InMemoryTaskStore {
    pub fn new(counter: Arc<InMemorySyncCounter>) -> Self {
        Self { by_id: Mutex::new(HashMap::new()), counter }
    }

    fn last_position(records: &HashMap<String, TaskRecord>, user_id: &str) -> Option<String> {
        records
            .values()
            .filter(|record| record.user_id == user_id)
            .map(|record| record.position.clone())
            .max()
    }
}

#[async_trait]
impl TaskStore for InMemoryTaskStore {
    async fn list_range(&self, input: ListTasksRangeInput) -> StoreResult<Vec<Task>> {
        let records = self.by_id.lock().expect("task store mutex");
        let mut visible: Vec<Task> = records
            .values()
            .filter(|record| {
                record.user_id == input.user_id
                    && !record.deleted
                    && record.task.date >= input.from
                    && record.task.date <= input.to
            })
            .map(|record| record.task.clone())
            .collect();
        visible.sort_by(by_schedule);
        Ok(visible)
    }

    async fn find_by_id(&self, input: &TaskRefInput) -> StoreResult<Option<Task>> {
        let records = self.by_id.lock().expect("task store mutex");
        Ok(records
            .get(&input.id)
            .filter(|record| record.user_id == input.user_id && !record.deleted)
            .map(|record| record.task.clone()))
    }

    async fn list_by_project(&self, input: ListTasksByProjectInput) -> StoreResult<Vec<Task>> {
        let records = self.by_id.lock().expect("task store mutex");
        let mut visible: Vec<Task> = records
            .values()
            .filter(|record| {
                record.user_id == input.user_id
                    && !record.deleted
                    && record.task.project_id.as_deref() == Some(input.project_id.as_str())
            })
            .map(|record| record.task.clone())
            .collect();
        visible.sort_by(by_schedule);
        Ok(visible)
    }

    async fn counts_by_project(&self, user_id: &str) -> StoreResult<Vec<ProjectTaskCounts>> {
        let records = self.by_id.lock().expect("task store mutex");
        let mut counts: HashMap<String, ProjectTaskCounts> = HashMap::new();
        for record in records.values() {
            if record.user_id != user_id || record.deleted {
                continue;
            }
            let Some(project_id) = record.task.project_id.clone() else { continue };
            let entry = counts.entry(project_id.clone()).or_insert(ProjectTaskCounts {
                project_id,
                total: 0,
                done: 0,
            });
            entry.total += 1;
            if record.task.status == TaskStatus::Done {
                entry.done += 1;
            }
        }
        Ok(counts.into_values().collect())
    }

    async fn create(&self, input: CreateTaskInput) -> StoreResult<Task> {
        let mut records = self.by_id.lock().expect("task store mutex");
        let position = order_key_after(Self::last_position(&records, &input.user_id).as_deref());
        let record = TaskRecord {
            task: Task {
                id: new_id(),
                project_id: input.project_id,
                title: input.title,
                date: input.date,
                start_at: input.start_at,
                duration_min: input.duration_min,
                status: TaskStatus::Todo,
                version: 1,
            },
            user_id: input.user_id.clone(),
            position,
            sync_seq: self.counter.next(&input.user_id),
            deleted: false,
        };
        records.insert(record.task.id.clone(), record.clone());
        Ok(record.task)
    }

    async fn update(&self, input: UpdateTaskInput) -> StoreResult<Option<Task>> {
        let mut records = self.by_id.lock().expect("task store mutex");
        let Some(record) = records.get_mut(&input.id) else { return Ok(None) };
        if record.user_id != input.user_id || record.deleted {
            return Ok(None);
        }
        if let Patch::Set(title) = input.patch.title {
            record.task.title = title;
        }
        if let Patch::Set(project_id) = input.patch.project_id {
            record.task.project_id = project_id;
        }
        if let Patch::Set(date) = input.patch.date {
            record.task.date = date;
        }
        if let Patch::Set(start_at) = input.patch.start_at {
            record.task.start_at = start_at;
        }
        if let Patch::Set(duration_min) = input.patch.duration_min {
            record.task.duration_min = duration_min;
        }
        if let Patch::Set(status) = input.patch.status {
            record.task.status = status;
        }
        record.task.version += 1;
        record.sync_seq = self.counter.next(&input.user_id);
        Ok(Some(record.task.clone()))
    }

    async fn remove(&self, input: &TaskRefInput) -> StoreResult<bool> {
        let mut records = self.by_id.lock().expect("task store mutex");
        let Some(record) = records.get_mut(&input.id) else { return Ok(false) };
        if record.user_id != input.user_id || record.deleted {
            return Ok(false);
        }
        record.deleted = true;
        record.task.version += 1;
        record.sync_seq = self.counter.next(&input.user_id);
        Ok(true)
    }

    async fn changes_since(&self, input: ListChangesInput) -> StoreResult<Vec<TaskChange>> {
        let records = self.by_id.lock().expect("task store mutex");
        let mut changed: Vec<&TaskRecord> = records
            .values()
            .filter(|record| record.user_id == input.user_id && record.sync_seq > input.cursor)
            .collect();
        changed.sort_by_key(|record| record.sync_seq);
        Ok(changed
            .into_iter()
            .map(|record| TaskChange {
                task: record.task.clone(),
                sync_seq: record.sync_seq,
                deleted: record.deleted,
            })
            .collect())
    }

    async fn sync_cursor(&self, user_id: &str) -> StoreResult<i64> {
        Ok(self.counter.current(user_id))
    }
}
