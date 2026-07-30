//! 인메모리 어댑터. `apps/bff/src/modules/task/adapters/memory.ts` 포팅.
//!
//! TS 클래스는 메서드가 `&this`를 잡고 내부 `Map`을 변이한다. Rust에서 같은
//! "공유 핸들을 부르면 내부가 바뀐다"를 재현하려면 `&self` + 내부 가변성이 필요하다 —
//! `RefCell`로 단일 스레드에서 처리한다(프로덕션이면 `Mutex`). 두 스토어가 하나의
//! sync 카운터를 공유하는 구조도 그대로 옮긴다(`Rc<SyncCounter>`).

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use crate::contract::{
    CreateProjectRequest, CreateTaskRequest, IsoDate, Project, ProjectChange, Task, TaskChange,
    TaskStatus,
};
use crate::ordering::key_after;
use crate::ports::{ProjectStore, ProjectTaskCounts, SyncBroker, TaskStore};

/// 유저별 단조증가 seq — SQL 구현의 sync_counters 대응. 두 스토어가 공유한다.
#[derive(Default)]
pub struct SyncCounter {
    seqs: RefCell<HashMap<String, u64>>,
}

impl SyncCounter {
    pub fn next(&self, user_id: &str) -> u64 {
        let mut seqs = self.seqs.borrow_mut();
        let n = seqs.get(user_id).copied().unwrap_or(0) + 1;
        seqs.insert(user_id.to_string(), n);
        n
    }
    pub fn current(&self, user_id: &str) -> u64 {
        self.seqs.borrow().get(user_id).copied().unwrap_or(0)
    }
}

struct ProjectRecord {
    project: Project,
    user_id: String,
    position: String,
    sync_seq: u64,
    deleted: bool,
}

struct TaskRecord {
    task: Task,
    user_id: String,
    position: String,
    sync_seq: u64,
    deleted: bool,
}

fn new_id(seq: u64) -> String {
    // 실제론 crypto id(`platform/ids.ts`). 테스트 결정성을 위해 seq 기반으로 둔다.
    format!("id_{seq:08}")
}

pub struct InMemoryProjectStore {
    by_id: RefCell<HashMap<String, ProjectRecord>>,
    counter: Rc<SyncCounter>,
}

impl InMemoryProjectStore {
    pub fn new(counter: Rc<SyncCounter>) -> Self {
        Self {
            by_id: RefCell::new(HashMap::new()),
            counter,
        }
    }

    fn last_position(&self, user_id: &str) -> Option<String> {
        self.by_id
            .borrow()
            .values()
            .filter(|r| r.user_id == user_id)
            .map(|r| r.position.clone())
            .max()
    }
}

impl ProjectStore for InMemoryProjectStore {
    fn list_by_user(&self, user_id: &str) -> Vec<Project> {
        let mut rows: Vec<_> = self
            .by_id
            .borrow()
            .values()
            .filter(|r| r.user_id == user_id && !r.deleted)
            .map(|r| (r.position.clone(), r.project.clone()))
            .collect();
        rows.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.id.cmp(&b.1.id)));
        rows.into_iter().map(|(_, p)| p).collect()
    }

    fn find_by_id(&self, user_id: &str, id: &str) -> Option<Project> {
        self.by_id
            .borrow()
            .get(id)
            .filter(|r| r.user_id == user_id && !r.deleted)
            .map(|r| r.project.clone())
    }

    fn create(&self, user_id: &str, req: &CreateProjectRequest) -> Project {
        let seq = self.counter.next(user_id);
        let project = Project {
            id: new_id(seq),
            name: req.name.as_str().to_string(),
            color: req.color,
        };
        let record = ProjectRecord {
            project: project.clone(),
            user_id: user_id.to_string(),
            position: key_after(self.last_position(user_id).as_deref()),
            sync_seq: seq,
            deleted: false,
        };
        self.by_id.borrow_mut().insert(project.id.clone(), record);
        project
    }

    fn changes_since(&self, user_id: &str, cursor: u64) -> Vec<ProjectChange> {
        let mut rows: Vec<_> = self
            .by_id
            .borrow()
            .values()
            .filter(|r| r.user_id == user_id && r.sync_seq > cursor)
            .map(|r| ProjectChange {
                project: r.project.clone(),
                sync_seq: r.sync_seq,
                deleted: r.deleted,
            })
            .collect();
        rows.sort_by_key(|c| c.sync_seq);
        rows
    }
}

pub struct InMemoryTaskStore {
    by_id: RefCell<HashMap<String, TaskRecord>>,
    counter: Rc<SyncCounter>,
}

impl InMemoryTaskStore {
    pub fn new(counter: Rc<SyncCounter>) -> Self {
        Self {
            by_id: RefCell::new(HashMap::new()),
            counter,
        }
    }

    fn last_position(&self, user_id: &str) -> Option<String> {
        self.by_id
            .borrow()
            .values()
            .filter(|r| r.user_id == user_id)
            .map(|r| r.position.clone())
            .max()
    }
}

impl TaskStore for InMemoryTaskStore {
    fn list_range(&self, user_id: &str, from: &IsoDate, to: &IsoDate) -> Vec<Task> {
        let mut rows: Vec<Task> = self
            .by_id
            .borrow()
            .values()
            .filter(|r| {
                r.user_id == user_id && !r.deleted && &r.task.date >= from && &r.task.date <= to
            })
            .map(|r| r.task.clone())
            .collect();
        rows.sort_by(|a, b| a.date.cmp(&b.date).then(a.start_at.cmp(&b.start_at)));
        rows
    }

    fn find_by_id(&self, user_id: &str, id: &str) -> Option<Task> {
        self.by_id
            .borrow()
            .get(id)
            .filter(|r| r.user_id == user_id && !r.deleted)
            .map(|r| r.task.clone())
    }

    fn list_by_project(&self, user_id: &str, project_id: &str) -> Vec<Task> {
        let mut rows: Vec<Task> = self
            .by_id
            .borrow()
            .values()
            .filter(|r| {
                r.user_id == user_id
                    && !r.deleted
                    && r.task.project_id.as_deref() == Some(project_id)
            })
            .map(|r| r.task.clone())
            .collect();
        rows.sort_by(|a, b| a.date.cmp(&b.date).then(a.start_at.cmp(&b.start_at)));
        rows
    }

    fn counts_by_project(&self, user_id: &str) -> Vec<ProjectTaskCounts> {
        let mut counts: HashMap<String, ProjectTaskCounts> = HashMap::new();
        for r in self.by_id.borrow().values() {
            if r.user_id != user_id || r.deleted {
                continue;
            }
            let Some(pid) = r.task.project_id.clone() else {
                continue;
            };
            let entry = counts.entry(pid.clone()).or_insert(ProjectTaskCounts {
                project_id: pid,
                total: 0,
                done: 0,
            });
            entry.total += 1;
            if r.task.status == TaskStatus::Done {
                entry.done += 1;
            }
        }
        counts.into_values().collect()
    }

    fn create(&self, user_id: &str, req: &CreateTaskRequest) -> Task {
        let seq = self.counter.next(user_id);
        let task = Task {
            id: new_id(seq),
            project_id: req.project_id.clone(),
            title: req.title.as_str().to_string(),
            date: req.date.clone(),
            start_at: req.start_at.clone(),
            duration_min: req.duration_min,
            status: TaskStatus::Todo,
            version: 1,
        };
        let record = TaskRecord {
            task: task.clone(),
            user_id: user_id.to_string(),
            position: key_after(self.last_position(user_id).as_deref()),
            sync_seq: seq,
            deleted: false,
        };
        self.by_id.borrow_mut().insert(task.id.clone(), record);
        task
    }

    fn update(&self, user_id: &str, id: &str, patch: &crate::contract::TaskPatch) -> Option<Task> {
        let mut by_id = self.by_id.borrow_mut();
        let record = by_id.get_mut(id)?;
        if record.user_id != user_id || record.deleted {
            return None;
        }
        if let Some(title) = &patch.title {
            record.task.title = title.as_str().to_string();
        }
        // 3-상태: Some(inner) = 바꿈, None = 안 바꿈. inner가 None이면 프로젝트에서 뗌.
        if let Some(project_id) = &patch.project_id {
            record.task.project_id = project_id.clone();
        }
        if let Some(date) = &patch.date {
            record.task.date = date.clone();
        }
        if let Some(start_at) = &patch.start_at {
            record.task.start_at = start_at.clone();
        }
        if let Some(duration_min) = patch.duration_min {
            record.task.duration_min = duration_min;
        }
        if let Some(status) = patch.status {
            record.task.status = status;
        }
        record.task.version += 1;
        record.sync_seq = self.counter.next(user_id);
        Some(record.task.clone())
    }

    fn remove(&self, user_id: &str, id: &str) -> bool {
        let mut by_id = self.by_id.borrow_mut();
        let Some(record) = by_id.get_mut(id) else {
            return false;
        };
        if record.user_id != user_id || record.deleted {
            return false;
        }
        record.deleted = true;
        record.task.version += 1;
        record.sync_seq = self.counter.next(user_id);
        true
    }

    fn changes_since(&self, user_id: &str, cursor: u64) -> Vec<TaskChange> {
        let mut rows: Vec<_> = self
            .by_id
            .borrow()
            .values()
            .filter(|r| r.user_id == user_id && r.sync_seq > cursor)
            .map(|r| TaskChange {
                task: r.task.clone(),
                sync_seq: r.sync_seq,
                deleted: r.deleted,
            })
            .collect();
        rows.sort_by_key(|c| c.sync_seq);
        rows
    }

    fn sync_cursor(&self, user_id: &str) -> u64 {
        self.counter.current(user_id)
    }
}

/// 알림 대상 유저를 기록만 하는 테스트용 브로커.
#[derive(Default)]
pub struct RecordingSyncBroker {
    pub notified: RefCell<Vec<String>>,
}

impl SyncBroker for RecordingSyncBroker {
    fn notify(&self, user_id: &str) {
        self.notified.borrow_mut().push(user_id.to_string());
    }
}
