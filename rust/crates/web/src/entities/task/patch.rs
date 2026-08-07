use tooday_shared::{Patch, Task, TaskPatch};

/// 낙관적 캐시 패치용 — 서버가 할 일(지정 필드 적용 + version 증가)을 캐시에 미리 흉내낸다.
/// 서버 결과와의 최종 수렴은 뮤테이션 정착 시 invalidate가 맡는다
/// (docs/conventions/web-cache-policy.md).
pub fn apply_task_patch(task: &Task, patch: &TaskPatch) -> Task {
    let mut next = task.clone();
    // 지정된 필드만 반영한다 — 미지정(Absent) 필드가 기존 값을 지우지 않는다
    if let Patch::Set(title) = &patch.title {
        next.title = title.clone();
    }
    if let Patch::Set(project_id) = &patch.project_id {
        next.project_id = project_id.clone();
    }
    if let Patch::Set(date) = &patch.date {
        next.date = date.clone();
    }
    if let Patch::Set(start_at) = &patch.start_at {
        next.start_at = start_at.clone();
    }
    if let Patch::Set(duration_min) = &patch.duration_min {
        next.duration_min = *duration_min;
    }
    if let Patch::Set(status) = &patch.status {
        next.status = *status;
    }
    next.version = task.version + 1;
    next
}

#[cfg(test)]
mod tests {
    use super::*;
    use tooday_shared::TaskStatus;

    fn task() -> Task {
        Task {
            id: "t1".into(),
            project_id: Some("p1".into()),
            title: "회의".into(),
            date: "2026-07-08".into(),
            start_at: "09:00".into(),
            duration_min: 30,
            status: TaskStatus::Todo,
            version: 3,
        }
    }

    #[test]
    fn 지정된_필드만_반영하고_version을_올린다() {
        let patched = apply_task_patch(&task(), &TaskPatch {
            status: Patch::Set(TaskStatus::Done),
            ..TaskPatch::default()
        });
        assert_eq!(patched, Task { status: TaskStatus::Done, version: 4, ..task() });
    }

    #[test]
    fn 미지정_필드는_기존_값을_지우지_않는다() {
        // TS의 `{ title: undefined, status: 'doing' }` — 없는 필드는 Absent다
        let patched = apply_task_patch(&task(), &TaskPatch {
            title: Patch::Absent,
            status: Patch::Set(TaskStatus::Doing),
            ..TaskPatch::default()
        });
        assert_eq!(patched, Task { status: TaskStatus::Doing, version: 4, ..task() });
    }

    #[test]
    fn null은_값_지정으로_취급한다() {
        // 프로젝트 해제가 낙관적으로 반영된다
        let patched = apply_task_patch(&task(), &TaskPatch {
            project_id: Patch::Set(None),
            ..TaskPatch::default()
        });
        assert_eq!(patched.project_id, None);
    }
}
