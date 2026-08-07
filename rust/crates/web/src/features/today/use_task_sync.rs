//! 기기 간 실시간 수렴 — TS `features/today/use-task-sync.ts` 대응.
//!
//! SSE로 "네 데이터 바뀜" 신호를 받으면 커서 이후의 델타(`task.changes`)를 당겨
//! range 캐시에 패치한다.
//!
//! 신호는 힌트일 뿐 커서가 진실이다: 신호가 유실돼도 재접속 직후 서버가 한 번 신호를
//! 쏘고, 그때 커서가 끊긴 사이의 변경을 전부 따라잡는다. EventSource의 자동 재접속이
//! 재연결을 담당하되, 액세스 쿠키 만료로 재접속이 401을 맞아 스트림이 영구 종료되면
//! tRPC와 같은 single-flight refresh로 쿠키를 갱신하고 재구독한다.

use tooday_shared::{SyncChangesResponse, TaskRangeRequest, TaskRangeResponse};

/// 델타를 range 캐시에 반영한다. 순수 함수라 전송과 무관하게 검증할 수 있다.
pub fn apply_delta(
    old: &TaskRangeResponse,
    delta: &SyncChangesResponse,
    range: &TaskRangeRequest,
) -> TaskRangeResponse {
    let mut tasks = old.tasks.clone();
    for change in &delta.tasks {
        tasks.retain(|task| task.id != change.task.id);
        // 삭제됐거나 주간 창 밖으로 이동한 행은 캐시에서 빠지는 것으로 반영된다
        if !change.deleted && change.task.date >= range.from && change.task.date <= range.to {
            tasks.push(change.task.clone());
        }
    }

    let mut projects = old.projects.clone();
    for change in &delta.projects {
        projects.retain(|project| project.id != change.project.id);
        if !change.deleted {
            projects.push(change.project.clone());
        }
    }

    TaskRangeResponse { tasks, projects, cursor: old.cursor.max(delta.cursor) }
}

#[cfg(target_arch = "wasm32")]
pub fn use_task_sync(range: TaskRangeRequest) {
    use std::cell::RefCell;
    use std::rc::Rc;

    use dioxus::prelude::*;

    use tooday_shared::SYNC_EVENTS_PATH;
    use wasm_bindgen::closure::Closure;
    use wasm_bindgen::JsCast;

    use crate::app::api::range_key;
    use crate::app::hooks::use_app;
    use crate::app::trpc::bff_url;

    let app = use_app();
    // 구독은 컴포넌트 수명 동안 살아 있으면 되고 결과를 읽지 않는다
    let _subscription = use_resource(move || {
        let app = app.clone();
        let range = range.clone();
        async move {
            let key = range_key(&range);
            // 신호 폭주는 "한 번 더"로 접는다 — 진행 중이면 재요청 플래그만 세운다
            let pulling = Rc::new(RefCell::new(false));
            let pending = Rc::new(RefCell::new(false));

            let pull = {
                let app = app.clone();
                let key = key.clone();
                let range = range.clone();
                let pulling = Rc::clone(&pulling);
                let pending = Rc::clone(&pending);
                move || {
                    if *pulling.borrow() {
                        *pending.borrow_mut() = true;
                        return;
                    }
                    *pulling.borrow_mut() = true;
                    let app = app.clone();
                    let key = key.clone();
                    let range = range.clone();
                    let pulling = Rc::clone(&pulling);
                    let pending = Rc::clone(&pending);
                    wasm_bindgen_futures::spawn_local(async move {
                        loop {
                            *pending.borrow_mut() = false;
                            let Some(current) =
                                app.trpc.query_client.get_query_data::<TaskRangeResponse>(&key)
                            else {
                                break;
                            };
                            match app.trpc.task_changes(current.cursor).await {
                                Ok(delta) if delta.cursor != current.cursor => {
                                    let next = apply_delta(&current, &delta, &range);
                                    app.trpc.query_client.set_query_data(&key, &next);
                                }
                                // 델타 실패는 다음 신호(또는 재접속 신호)가 재시도한다
                                Ok(_) | Err(_) => {}
                            }
                            if !*pending.borrow() {
                                break;
                            }
                        }
                        *pulling.borrow_mut() = false;
                    });
                }
            };

            // 쿠키 인증이므로 자격증명을 실어 접속한다
            let init = web_sys::EventSourceInit::new();
            init.set_with_credentials(true);
            let Ok(source) =
                web_sys::EventSource::new_with_event_source_init_dict(&bff_url(SYNC_EVENTS_PATH), &init)
            else {
                return;
            };

            let on_change = Closure::<dyn FnMut(web_sys::MessageEvent)>::new({
                let pull = pull.clone();
                move |_event: web_sys::MessageEvent| pull()
            });
            source.add_event_listener_with_callback("change", on_change.as_ref().unchecked_ref()).ok();
            // 리스너는 페이지 수명 동안 살아 있어야 한다 — 구독 해제는 EventSource가 닫힐 때다
            on_change.forget();
        }
    });
}

#[cfg(not(target_arch = "wasm32"))]
pub fn use_task_sync(_range: TaskRangeRequest) {
    // SSE는 브라우저 전용이다. 네이티브 빌드(테스트·타입체크)에서는 아무것도 하지 않는다.
}

#[cfg(test)]
mod tests {
    use super::*;
    use tooday_shared::{Project, ProjectChange, ProjectColor, Task, TaskChange, TaskStatus};

    fn range() -> TaskRangeRequest {
        TaskRangeRequest { from: "2026-07-02".into(), to: "2026-07-08".into() }
    }

    fn task(id: &str, date: &str) -> Task {
        Task {
            id: id.into(),
            project_id: None,
            title: id.into(),
            date: date.into(),
            start_at: "09:00".into(),
            duration_min: 30,
            status: TaskStatus::Todo,
            version: 1,
        }
    }

    fn project(id: &str) -> Project {
        Project { id: id.into(), name: id.into(), color: ProjectColor::Blue }
    }

    fn snapshot(tasks: Vec<Task>, projects: Vec<Project>, cursor: i64) -> TaskRangeResponse {
        TaskRangeResponse { tasks, projects, cursor }
    }

    fn delta(tasks: Vec<TaskChange>, projects: Vec<ProjectChange>, cursor: i64) -> SyncChangesResponse {
        SyncChangesResponse { tasks, projects, cursor }
    }

    #[test]
    fn 바뀐_행을_같은_id의_기존_행과_교체한다() {
        let old = snapshot(vec![task("a", "2026-07-04")], vec![], 1);
        let mut updated = task("a", "2026-07-04");
        updated.status = TaskStatus::Done;
        updated.version = 2;

        let next = apply_delta(
            &old,
            &delta(vec![TaskChange { task: updated.clone(), sync_seq: 2, deleted: false }], vec![], 2),
            &range(),
        );

        assert_eq!(next.tasks, vec![updated]);
        assert_eq!(next.cursor, 2);
    }

    #[test]
    fn tombstone은_캐시에서_빠진다() {
        let old = snapshot(vec![task("a", "2026-07-04")], vec![], 1);

        let next = apply_delta(
            &old,
            &delta(vec![TaskChange { task: task("a", "2026-07-04"), sync_seq: 2, deleted: true }], vec![], 2),
            &range(),
        );

        assert_eq!(next.tasks, vec![]);
    }

    #[test]
    fn 주간_창_밖으로_옮겨진_행도_캐시에서_빠진다() {
        let old = snapshot(vec![task("a", "2026-07-04")], vec![], 1);

        let next = apply_delta(
            &old,
            &delta(
                vec![TaskChange { task: task("a", "2026-07-20"), sync_seq: 2, deleted: false }],
                vec![],
                2,
            ),
            &range(),
        );

        assert_eq!(next.tasks, vec![]);
    }

    #[test]
    fn 창_안으로_새로_들어온_행은_추가된다() {
        let old = snapshot(vec![], vec![], 1);

        let next = apply_delta(
            &old,
            &delta(
                vec![TaskChange { task: task("b", "2026-07-05"), sync_seq: 2, deleted: false }],
                vec![],
                2,
            ),
            &range(),
        );

        assert_eq!(next.tasks, vec![task("b", "2026-07-05")]);
    }

    #[test]
    fn 프로젝트_델타도_같은_규칙으로_반영된다() {
        let old = snapshot(vec![], vec![project("p1")], 1);

        let next = apply_delta(
            &old,
            &delta(
                vec![],
                vec![
                    ProjectChange { project: project("p1"), sync_seq: 2, deleted: true },
                    ProjectChange { project: project("p2"), sync_seq: 3, deleted: false },
                ],
                3,
            ),
            &range(),
        );

        assert_eq!(next.projects, vec![project("p2")]);
    }

    #[test]
    fn 커서는_뒤로_가지_않는다() {
        let old = snapshot(vec![], vec![], 9);
        let next = apply_delta(&old, &delta(vec![], vec![], 3), &range());
        assert_eq!(next.cursor, 9);
    }
}
