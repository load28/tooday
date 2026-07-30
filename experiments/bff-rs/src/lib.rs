//! TooDay BFF task 슬라이스의 Rust 포팅 (T036).
//!
//! `apps/bff`의 task 모듈 수직 슬라이스를 옮겨, TypeScript(Hono+tRPC+valibot) 대비
//! Rust의 타입 추론 특성을 실제 컴파일되는 코드로 비교하기 위한 실험 크레이트다.
//! 전체 비교 분석은 `docs/bff-rust-vs-typescript.md` 참고.

pub mod contract;
pub mod errors;
pub mod ordering;
pub mod ports;
pub mod router;
pub mod store;

#[cfg(test)]
mod tests {
    use crate::contract::*;
    use crate::errors::{DomainError, TransportCode};
    use crate::ports::TaskStore;
    use crate::router::{Ctx, TaskRouter};
    use crate::store::{InMemoryProjectStore, InMemoryTaskStore, RecordingSyncBroker, SyncCounter};
    use std::rc::Rc;

    fn iso_date(s: &str) -> IsoDate {
        IsoDate::try_from(s.to_string()).unwrap()
    }
    fn iso_time(s: &str) -> IsoTime {
        IsoTime::try_from(s.to_string()).unwrap()
    }
    fn text(s: &str) -> NonEmptyText {
        NonEmptyText::try_from(s.to_string()).unwrap()
    }
    fn dur(n: i64) -> DurationMin {
        DurationMin::try_from(n).unwrap()
    }

    fn wiring() -> (Rc<SyncCounter>, InMemoryTaskStore, InMemoryProjectStore, RecordingSyncBroker) {
        let counter = Rc::new(SyncCounter::default());
        (
            counter.clone(),
            InMemoryTaskStore::new(counter.clone()),
            InMemoryProjectStore::new(counter.clone()),
            RecordingSyncBroker::default(),
        )
    }

    fn create_req(title: &str, project_id: Option<&str>) -> CreateTaskRequest {
        CreateTaskRequest {
            title: text(title),
            project_id: project_id.map(str::to_string),
            date: iso_date("2026-07-30"),
            start_at: iso_time("09:00"),
            duration_min: dur(30),
        }
    }

    #[test]
    fn create_then_range_roundtrip() {
        let (_c, tasks, projects, sync) = wiring();
        let router = TaskRouter { tasks: &tasks, projects: &projects, sync: &sync };
        let ctx = Ctx { user_id: "u1".into() };

        let created = router.create(&ctx, create_req("write report", None)).unwrap();
        assert_eq!(created.task.version, 1);
        assert_eq!(created.task.status, TaskStatus::Todo);

        let range = router
            .range(&ctx, TaskRangeRequest { from: iso_date("2026-07-01"), to: iso_date("2026-07-31") })
            .unwrap();
        assert_eq!(range.tasks.len(), 1);
        assert_eq!(range.tasks[0].title, "write report");
        assert_eq!(range.cursor, 1);
        assert_eq!(*sync.notified.borrow(), vec!["u1"]);
    }

    #[test]
    fn owner_scoping_hides_other_users() {
        let (_c, tasks, projects, sync) = wiring();
        let router = TaskRouter { tasks: &tasks, projects: &projects, sync: &sync };
        let owner = Ctx { user_id: "u1".into() };
        let intruder = Ctx { user_id: "u2".into() };

        let created = router.create(&owner, create_req("secret", None)).unwrap();
        // 다른 유저는 조회 시 TaskNotFound.
        let err = router
            .by_id(&intruder, TaskIdRequest { id: created.task.id.clone() })
            .unwrap_err();
        assert_eq!(err, DomainError::TaskNotFound);
        assert_eq!(err.transport_code(), TransportCode::NotFound);
    }

    #[test]
    fn update_is_field_level_and_bumps_version() {
        let (_c, tasks, projects, sync) = wiring();
        let router = TaskRouter { tasks: &tasks, projects: &projects, sync: &sync };
        let ctx = Ctx { user_id: "u1".into() };
        let created = router.create(&ctx, create_req("draft", None)).unwrap();

        // status만 바꾸는 patch — 나머지 필드는 보존.
        let patch = TaskPatch { status: Some(TaskStatus::Done), ..Default::default() };
        let updated = router
            .update(&ctx, UpdateTaskRequest { id: created.task.id.clone(), patch })
            .unwrap();
        assert_eq!(updated.task.status, TaskStatus::Done);
        assert_eq!(updated.task.title, "draft");
        assert_eq!(updated.task.version, 2);
    }

    #[test]
    fn create_with_missing_project_is_not_found() {
        let (_c, tasks, projects, sync) = wiring();
        let router = TaskRouter { tasks: &tasks, projects: &projects, sync: &sync };
        let ctx = Ctx { user_id: "u1".into() };
        let err = router
            .create(&ctx, create_req("x", Some("ghost")))
            .unwrap_err();
        assert_eq!(err, DomainError::ProjectNotFound);
    }

    #[test]
    fn delete_tombstones_and_streams_in_changes() {
        let (_c, tasks, projects, sync) = wiring();
        let router = TaskRouter { tasks: &tasks, projects: &projects, sync: &sync };
        let ctx = Ctx { user_id: "u1".into() };
        let created = router.create(&ctx, create_req("temp", None)).unwrap();

        router.delete(&ctx, TaskIdRequest { id: created.task.id.clone() }).unwrap();
        // 재삭제는 TaskNotFound.
        let again = router.delete(&ctx, TaskIdRequest { id: created.task.id.clone() }).unwrap_err();
        assert_eq!(again, DomainError::TaskNotFound);

        let changes = router.changes(&ctx, SyncChangesRequest { cursor: 0 }).unwrap();
        let tombstone = changes.tasks.iter().find(|c| c.task.id == created.task.id).unwrap();
        assert!(tombstone.deleted);
        assert_eq!(changes.cursor, tasks.sync_cursor(&ctx.user_id));
    }

    #[test]
    fn projects_carry_progress_counts() {
        let (_c, tasks, projects, sync) = wiring();
        let router = TaskRouter { tasks: &tasks, projects: &projects, sync: &sync };
        let ctx = Ctx { user_id: "u1".into() };
        let proj = router
            .create_project(&ctx, CreateProjectRequest { name: text("Work"), color: ProjectColor::Blue })
            .unwrap();
        let pid = proj.project.id.clone();

        let a = router.create(&ctx, create_req("a", Some(&pid))).unwrap();
        router.create(&ctx, create_req("b", Some(&pid))).unwrap();
        // a를 done으로.
        router
            .update(
                &ctx,
                UpdateTaskRequest {
                    id: a.task.id,
                    patch: TaskPatch { status: Some(TaskStatus::Done), ..Default::default() },
                },
            )
            .unwrap();

        let list = router.projects(&ctx).unwrap();
        let summary = list.projects.iter().find(|p| p.project.id == pid).unwrap();
        assert_eq!(summary.total_count, 2);
        assert_eq!(summary.done_count, 1);
    }

    // ── 계약 검증(디코드 시점) ────────────────────────────────────────────────

    #[test]
    fn json_decode_validates_via_newtypes() {
        // 유효 요청 — camelCase JSON이 그대로 디코드된다.
        let ok: CreateTaskRequest = serde_json::from_str(
            r#"{"title":"  buy milk  ","date":"2026-07-30","startAt":"09:00","durationMin":30}"#,
        )
        .unwrap();
        assert_eq!(ok.title.as_str(), "buy milk"); // trim 적용됨
        assert_eq!(ok.project_id, None); // 부재 → 기본 null

        // 잘못된 날짜는 디코드 단계에서 거부.
        let bad: Result<CreateTaskRequest, _> = serde_json::from_str(
            r#"{"title":"x","date":"2026/07/30","startAt":"09:00","durationMin":30}"#,
        );
        assert!(bad.is_err());

        // durationMin=0은 거부(minValue 1).
        let zero: Result<CreateTaskRequest, _> = serde_json::from_str(
            r#"{"title":"x","date":"2026-07-30","startAt":"09:00","durationMin":0}"#,
        );
        assert!(zero.is_err());
    }

    #[test]
    fn patch_project_id_three_states() {
        // 부재 → 안 바꿈(바깥 None)
        let absent: TaskPatch = serde_json::from_str(r#"{"title":"x"}"#).unwrap();
        assert_eq!(absent.project_id, None);

        // null → 프로젝트에서 뗌(Some(None))
        let cleared: TaskPatch = serde_json::from_str(r#"{"projectId":null}"#).unwrap();
        assert_eq!(cleared.project_id, Some(None));

        // 문자열 → 붙임(Some(Some))
        let set: TaskPatch = serde_json::from_str(r#"{"projectId":"p1"}"#).unwrap();
        assert_eq!(set.project_id, Some(Some("p1".to_string())));
    }

    #[test]
    fn all_domain_errors_map_to_a_transport_code() {
        for err in [
            DomainError::EmailTaken,
            DomainError::InvalidCredentials,
            DomainError::Unauthenticated,
            DomainError::ProjectNotFound,
            DomainError::TaskNotFound,
        ] {
            // 매핑이 exhaustive라 컴파일이 곧 전수 보장. 여기선 런타임으로도 확인.
            let _ = err.transport_code();
            assert!(!err.message().is_empty());
        }
    }
}
