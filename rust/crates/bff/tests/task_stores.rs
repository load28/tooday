//! `apps/bff/src/modules/task/adapters/adapters.test.ts` + `user/adapters/adapters.test.ts`의 포팅본.
//!
//! memory와 sql 두 구현에 같은 포트 계약을 돌린다. sql은 실제 Postgres가 있을 때만
//! 돈다(`TOODAY_TEST_DATABASE_URL`).

use std::sync::Arc;

use tooday_shared::{Patch, ProjectColor, TaskPatch, TaskStatus};

use tooday_bff::modules::task::adapters::memory::{
    InMemoryProjectStore, InMemorySyncCounter, InMemoryTaskStore,
};
use tooday_bff::modules::task::adapters::sql::{SqlProjectStore, SqlTaskStore};
use tooday_bff::modules::task::ports::{
    CreateProjectInput, CreateTaskInput, ListChangesInput, ListTasksByProjectInput,
    ListTasksRangeInput, ProjectStore, ProjectTaskCounts, TaskRefInput, TaskStore, UpdateTaskInput,
};
use tooday_bff::modules::user::adapters::sql::SqlUserReader;
use tooday_bff::modules::user::ports::UserReader;
use tooday_bff::platform::db::testing::{test_database, test_database_url};

const USER_A: &str = "00000000-0000-7000-8000-00000000000a";
const USER_B: &str = "00000000-0000-7000-8000-00000000000b";

struct Stores {
    projects: Arc<dyn ProjectStore>,
    tasks: Arc<dyn TaskStore>,
}

fn task_input() -> CreateTaskInput {
    CreateTaskInput {
        user_id: USER_A.into(),
        title: "시간 뷰 프로토타입".into(),
        project_id: None,
        date: "2026-07-04".into(),
        start_at: "13:30".into(),
        duration_min: 120,
    }
}

fn project_input(user_id: &str, name: &str, color: ProjectColor) -> CreateProjectInput {
    CreateProjectInput { user_id: user_id.into(), name: name.into(), color }
}

fn task_ref(user_id: &str, id: &str) -> TaskRefInput {
    TaskRefInput { user_id: user_id.into(), id: id.into() }
}

fn status_patch(status: TaskStatus) -> TaskPatch {
    TaskPatch { status: Patch::Set(status), ..TaskPatch::default() }
}

async fn memory_stores() -> Stores {
    let counter = InMemorySyncCounter::new();
    Stores {
        projects: Arc::new(InMemoryProjectStore::new(Arc::clone(&counter))),
        tasks: Arc::new(InMemoryTaskStore::new(counter)),
    }
}

/// SQL 구현은 tasks.user_id FK 때문에 실제 유저 행이 필요하다
async fn sql_stores() -> Option<Stores> {
    test_database_url()?;
    let pool = test_database().await;
    for id in [USER_A, USER_B] {
        sqlx::query("insert into users (id, email, name, password_hash) values ($1::uuid, $2, $3, 'x')")
            .bind(id)
            .bind(format!("{id}@tooday.app"))
            .bind(id)
            .execute(&pool)
            .await
            .expect("유저 시드");
    }
    Some(Stores {
        projects: Arc::new(SqlProjectStore::new(pool.clone())),
        tasks: Arc::new(SqlTaskStore::new(pool)),
    })
}

async fn for_each_implementation<F, Fut>(body: F)
where
    F: Fn(Stores, &'static str) -> Fut,
    Fut: std::future::Future<Output = ()>,
{
    body(memory_stores().await, "memory").await;
    if let Some(stores) = sql_stores().await {
        body(stores, "sql(postgres)").await;
    }
}

#[tokio::test]
async fn 프로젝트를_만들고_유저별로_생성_순서로_조회한다() {
    for_each_implementation(|stores, name| async move {
        let daily = stores
            .projects
            .create(project_input(USER_A, "일상", ProjectColor::Mint))
            .await
            .expect("생성");
        let tooday = stores
            .projects
            .create(project_input(USER_A, "TooDay 앱", ProjectColor::Blue))
            .await
            .expect("생성");
        stores
            .projects
            .create(project_input(USER_B, "남의 프로젝트", ProjectColor::Gray))
            .await
            .expect("생성");

        assert_eq!(
            stores.projects.list_by_user(USER_A).await.expect("조회"),
            vec![daily, tooday.clone()],
            "{name}"
        );
        assert_eq!(
            stores.projects.find_by_id(&task_ref(USER_A, &tooday.id)).await.expect("조회"),
            Some(tooday.clone()),
            "{name}"
        );
        assert_eq!(
            stores.projects.find_by_id(&task_ref(USER_B, &tooday.id)).await.expect("조회"),
            None,
            "{name}"
        );
    })
    .await;
}

#[tokio::test]
async fn 태스크를_범위로_조회한다() {
    for_each_implementation(|stores, name| async move {
        let afternoon = stores.tasks.create(task_input()).await.expect("생성");
        let morning = stores
            .tasks
            .create(CreateTaskInput {
                title: "아침 스트레칭".into(),
                start_at: "07:30".into(),
                ..task_input()
            })
            .await
            .expect("생성");
        let next_day = stores
            .tasks
            .create(CreateTaskInput {
                title: "컴포넌트 리뷰".into(),
                date: "2026-07-05".into(),
                ..task_input()
            })
            .await
            .expect("생성");
        stores
            .tasks
            .create(CreateTaskInput { title: "범위 밖".into(), date: "2026-07-20".into(), ..task_input() })
            .await
            .expect("생성");
        stores
            .tasks
            .create(CreateTaskInput {
                user_id: USER_B.into(),
                title: "남의 태스크".into(),
                ..task_input()
            })
            .await
            .expect("생성");

        let listed = stores
            .tasks
            .list_range(ListTasksRangeInput {
                user_id: USER_A.into(),
                from: "2026-07-02".into(),
                to: "2026-07-08".into(),
            })
            .await
            .expect("조회");
        assert_eq!(listed, vec![morning, afternoon, next_day], "{name}");
    })
    .await;
}

#[tokio::test]
async fn find_by_id는_소유자의_살아있는_태스크만_돌려준다() {
    for_each_implementation(|stores, name| async move {
        let task = stores.tasks.create(task_input()).await.expect("생성");

        assert_eq!(
            stores.tasks.find_by_id(&task_ref(USER_A, &task.id)).await.expect("조회"),
            Some(task.clone()),
            "{name}"
        );
        assert_eq!(stores.tasks.find_by_id(&task_ref(USER_B, &task.id)).await.expect("조회"), None, "{name}");
        let unknown = uuid::Uuid::now_v7().to_string();
        assert_eq!(stores.tasks.find_by_id(&task_ref(USER_A, &unknown)).await.expect("조회"), None, "{name}");

        stores.tasks.remove(&task_ref(USER_A, &task.id)).await.expect("삭제");
        assert_eq!(stores.tasks.find_by_id(&task_ref(USER_A, &task.id)).await.expect("조회"), None, "{name}");
    })
    .await;
}

#[tokio::test]
async fn list_by_project는_그_프로젝트의_살아있는_태스크만_돌려준다() {
    for_each_implementation(|stores, name| async move {
        let project = stores
            .projects
            .create(project_input(USER_A, "TooDay 앱", ProjectColor::Blue))
            .await
            .expect("생성");
        let other = stores
            .projects
            .create(project_input(USER_A, "일상", ProjectColor::Mint))
            .await
            .expect("생성");

        let afternoon = stores
            .tasks
            .create(CreateTaskInput { project_id: Some(project.id.clone()), ..task_input() })
            .await
            .expect("생성");
        let morning = stores
            .tasks
            .create(CreateTaskInput {
                project_id: Some(project.id.clone()),
                title: "아침".into(),
                start_at: "07:30".into(),
                ..task_input()
            })
            .await
            .expect("생성");
        stores
            .tasks
            .create(CreateTaskInput {
                project_id: Some(other.id),
                title: "다른 프로젝트".into(),
                ..task_input()
            })
            .await
            .expect("생성");
        stores
            .tasks
            .create(CreateTaskInput { project_id: None, title: "프로젝트 없음".into(), ..task_input() })
            .await
            .expect("생성");
        let removed = stores
            .tasks
            .create(CreateTaskInput {
                project_id: Some(project.id.clone()),
                title: "삭제될 것".into(),
                ..task_input()
            })
            .await
            .expect("생성");
        stores.tasks.remove(&task_ref(USER_A, &removed.id)).await.expect("삭제");

        let listed = stores
            .tasks
            .list_by_project(ListTasksByProjectInput {
                user_id: USER_A.into(),
                project_id: project.id.clone(),
            })
            .await
            .expect("조회");
        assert_eq!(listed, vec![morning, afternoon], "{name}");

        let other_user = stores
            .tasks
            .list_by_project(ListTasksByProjectInput {
                user_id: USER_B.into(),
                project_id: project.id,
            })
            .await
            .expect("조회");
        assert_eq!(other_user, vec![], "{name}");
    })
    .await;
}

#[tokio::test]
async fn counts_by_project는_완료_전체를_세고_프로젝트_없는_삭제된_태스크는_뺀다() {
    for_each_implementation(|stores, name| async move {
        let project = stores
            .projects
            .create(project_input(USER_A, "TooDay 앱", ProjectColor::Blue))
            .await
            .expect("생성");

        let done = stores
            .tasks
            .create(CreateTaskInput {
                project_id: Some(project.id.clone()),
                title: "완료할 것".into(),
                ..task_input()
            })
            .await
            .expect("생성");
        stores
            .tasks
            .update(UpdateTaskInput {
                user_id: USER_A.into(),
                id: done.id,
                patch: status_patch(TaskStatus::Done),
            })
            .await
            .expect("수정");
        stores
            .tasks
            .create(CreateTaskInput {
                project_id: Some(project.id.clone()),
                title: "남은 것".into(),
                ..task_input()
            })
            .await
            .expect("생성");
        stores
            .tasks
            .create(CreateTaskInput { project_id: None, title: "프로젝트 없음".into(), ..task_input() })
            .await
            .expect("생성");
        let removed = stores
            .tasks
            .create(CreateTaskInput {
                project_id: Some(project.id.clone()),
                title: "삭제될 것".into(),
                ..task_input()
            })
            .await
            .expect("생성");
        stores.tasks.remove(&task_ref(USER_A, &removed.id)).await.expect("삭제");

        assert_eq!(
            stores.tasks.counts_by_project(USER_A).await.expect("집계"),
            vec![ProjectTaskCounts { project_id: project.id, total: 2, done: 1 }],
            "{name}"
        );
        assert_eq!(stores.tasks.counts_by_project(USER_B).await.expect("집계"), vec![], "{name}");
    })
    .await;
}

#[tokio::test]
async fn remove는_소프트_삭제로_tombstone을_델타에_싣는다() {
    for_each_implementation(|stores, name| async move {
        let task = stores.tasks.create(task_input()).await.expect("생성"); // seq 1

        assert!(!stores.tasks.remove(&task_ref(USER_B, &task.id)).await.expect("삭제"), "{name}");
        assert!(stores.tasks.remove(&task_ref(USER_A, &task.id)).await.expect("삭제"), "{name}"); // seq 2
        assert!(!stores.tasks.remove(&task_ref(USER_A, &task.id)).await.expect("삭제"), "{name}");

        let listed = stores
            .tasks
            .list_range(ListTasksRangeInput {
                user_id: USER_A.into(),
                from: "2026-07-01".into(),
                to: "2026-07-31".into(),
            })
            .await
            .expect("조회");
        assert_eq!(listed, vec![], "{name}");

        let changes = stores
            .tasks
            .changes_since(ListChangesInput { user_id: USER_A.into(), cursor: 1 })
            .await
            .expect("델타");
        assert_eq!(changes.len(), 1, "{name}");
        assert_eq!(changes[0].task.id, task.id, "{name}");
        assert!(changes[0].deleted, "{name}");
    })
    .await;
}

#[tokio::test]
async fn update는_patch의_필드만_적용하고_version을_올린다() {
    for_each_implementation(|stores, name| async move {
        let task = stores.tasks.create(task_input()).await.expect("생성");
        assert_eq!(task.version, 1, "{name}");

        let after_status = stores
            .tasks
            .update(UpdateTaskInput {
                user_id: USER_A.into(),
                id: task.id.clone(),
                patch: status_patch(TaskStatus::Done),
            })
            .await
            .expect("수정");
        assert_eq!(
            after_status,
            Some(tooday_shared::Task { status: TaskStatus::Done, version: 2, ..task.clone() }),
            "{name}"
        );

        // 제목만 고쳐도 방금의 status 변경이 보존된다 — 행 전체 덮어쓰기가 아니라는 증거
        let after_title = stores
            .tasks
            .update(UpdateTaskInput {
                user_id: USER_A.into(),
                id: task.id.clone(),
                patch: TaskPatch { title: Patch::Set("수정된 제목".into()), ..TaskPatch::default() },
            })
            .await
            .expect("수정");
        assert_eq!(
            after_title,
            Some(tooday_shared::Task {
                status: TaskStatus::Done,
                title: "수정된 제목".into(),
                version: 3,
                ..task
            }),
            "{name}"
        );
    })
    .await;
}

#[tokio::test]
async fn 소유자가_아니거나_없는_태스크의_update는_none이다() {
    for_each_implementation(|stores, name| async move {
        let task = stores.tasks.create(task_input()).await.expect("생성");

        let other_user = stores
            .tasks
            .update(UpdateTaskInput {
                user_id: USER_B.into(),
                id: task.id,
                patch: status_patch(TaskStatus::Done),
            })
            .await
            .expect("수정");
        assert_eq!(other_user, None, "{name}");

        let unknown = stores
            .tasks
            .update(UpdateTaskInput {
                user_id: USER_A.into(),
                id: uuid::Uuid::now_v7().to_string(),
                patch: status_patch(TaskStatus::Done),
            })
            .await
            .expect("수정");
        assert_eq!(unknown, None, "{name}");
    })
    .await;
}

#[tokio::test]
async fn 쓰기마다_커서가_전진하고_changes_since는_커서_이후만_내려준다() {
    for_each_implementation(|stores, name| async move {
        assert_eq!(stores.tasks.sync_cursor(USER_A).await.expect("커서"), 0, "{name}");

        let project = stores
            .projects
            .create(project_input(USER_A, "TooDay 앱", ProjectColor::Blue))
            .await
            .expect("생성"); // seq 1
        let task = stores.tasks.create(task_input()).await.expect("생성"); // seq 2
        assert_eq!(stores.tasks.sync_cursor(USER_A).await.expect("커서"), 2, "{name}");

        stores
            .tasks
            .update(UpdateTaskInput {
                user_id: USER_A.into(),
                id: task.id.clone(),
                patch: status_patch(TaskStatus::Done),
            })
            .await
            .expect("수정"); // seq 3

        let task_changes = stores
            .tasks
            .changes_since(ListChangesInput { user_id: USER_A.into(), cursor: 2 })
            .await
            .expect("델타");
        assert_eq!(
            task_changes,
            vec![tooday_shared::TaskChange {
                task: tooday_shared::Task { status: TaskStatus::Done, version: 2, ..task },
                sync_seq: 3,
                deleted: false,
            }],
            "{name}"
        );

        let project_changes = stores
            .projects
            .changes_since(ListChangesInput { user_id: USER_A.into(), cursor: 0 })
            .await
            .expect("델타");
        assert_eq!(
            project_changes,
            vec![tooday_shared::ProjectChange { project, sync_seq: 1, deleted: false }],
            "{name}"
        );

        let empty = stores
            .tasks
            .changes_since(ListChangesInput { user_id: USER_A.into(), cursor: 3 })
            .await
            .expect("델타");
        assert_eq!(empty, vec![], "{name}");

        // 유저 격리 — B의 커서·델타는 A의 쓰기에 영향받지 않는다
        assert_eq!(stores.tasks.sync_cursor(USER_B).await.expect("커서"), 0, "{name}");
        let other = stores
            .tasks
            .changes_since(ListChangesInput { user_id: USER_B.into(), cursor: 0 })
            .await
            .expect("델타");
        assert_eq!(other, vec![], "{name}");
    })
    .await;
}

/// `apps/bff/src/modules/user/adapters/adapters.test.ts` — UserReader 포트 계약
#[tokio::test]
async fn user_reader는_id로_유저를_조회하고_없으면_none이다() {
    let Some(_) = test_database_url() else { return };
    let pool = test_database().await;

    // users 테이블 쓰기는 auth 모듈 소유 — 어댑터 단위 테스트에서는 시드로 직접 삽입한다
    let user = tooday_shared::User {
        id: uuid::Uuid::now_v7().to_string(),
        email: "reader@tooday.app".into(),
        name: "리더".into(),
    };
    sqlx::query("insert into users (id, email, name, password_hash) values ($1::uuid, $2, $3, 'seed-only')")
        .bind(&user.id)
        .bind(&user.email)
        .bind(&user.name)
        .execute(&pool)
        .await
        .expect("유저 시드");

    let reader = SqlUserReader::new(pool);
    assert_eq!(reader.find_by_id(&user.id).await.expect("조회"), Some(user));
    let unknown = uuid::Uuid::now_v7().to_string();
    assert_eq!(reader.find_by_id(&unknown).await.expect("조회"), None);
}
