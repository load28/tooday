//! 버전드 마이그레이션 — 불변 이력이다.
//!
//! 키 이름의 사전순이 곧 적용 순서다. 새 변경은 다음 번호로 추가하고 기존 항목은
//! 수정하지 않는다. CHECK의 허용값 목록은 계약(`tooday_shared`)을 참조하지 않고 당시
//! 값을 리터럴로 동결한다 — 값이 늘면 제약을 바꾸는 새 마이그레이션을 추가한다.
//!
//! 이름·순서·최종 스키마를 TS(Kysely) 마이그레이션과 동일하게 유지하고 이력 테이블도
//! 같은 `kysely_migration`을 쓴다 — 두 구현이 같은 데이터베이스를 두고 교체 가능하다.

use sqlx::{Postgres, Transaction};

use crate::platform::ordering::order_key_after;

pub struct Migration {
    pub name: &'static str,
    pub up: for<'a, 'c> fn(&'a mut Transaction<'c, Postgres>) -> BoxFuture<'a>,
}

type BoxFuture<'a> = std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), sqlx::Error>> + Send + 'a>>;

pub fn migrations() -> Vec<Migration> {
    vec![
        Migration { name: "0001_init", up: |tx| Box::pin(migration_0001_init(tx)) },
        Migration {
            name: "0002_fractional_position",
            up: |tx| Box::pin(migration_0002_fractional_position(tx)),
        },
        Migration { name: "0003_sync", up: |tx| Box::pin(migration_0003_sync(tx)) },
        Migration { name: "0004_refresh_tokens", up: |tx| Box::pin(migration_0004_refresh_tokens(tx)) },
        Migration { name: "0005_reuse_detection", up: |tx| Box::pin(migration_0005_reuse_detection(tx)) },
        Migration { name: "0006_session_id", up: |tx| Box::pin(migration_0006_session_id(tx)) },
    ]
}

async fn run(tx: &mut Transaction<'_, Postgres>, statements: &[&str]) -> Result<(), sqlx::Error> {
    for statement in statements {
        sqlx::query(statement).execute(&mut **tx).await?;
    }
    Ok(())
}

/// 0001 — 초기 스키마 (PostgreSQL).
async fn migration_0001_init(tx: &mut Transaction<'_, Postgres>) -> Result<(), sqlx::Error> {
    run(
        tx,
        &[
            // 이메일 소문자 정규화를 앱 레이어에만 의존하지 않고 DB가 보장한다
            r#"create table users (
                id uuid primary key,
                email text not null unique,
                name text not null,
                password_hash text not null,
                created_at timestamptz not null default now(),
                updated_at timestamptz not null default now(),
                constraint users_email_lowercase check (email = lower(email))
            )"#,
            r#"create table sessions (
                token_hash text primary key,
                user_id uuid not null references users(id) on delete cascade,
                expires_at timestamptz not null,
                created_at timestamptz not null default now()
            )"#,
            // 유저 단위 일괄 무효화(전 기기 로그아웃) 경로
            r#"create index sessions_user_id on sessions (user_id)"#,
            // 만료 세션 청소 배치 경로
            r#"create index sessions_expires_at on sessions (expires_at)"#,
            r#"create table projects (
                id uuid primary key,
                user_id uuid not null references users(id) on delete cascade,
                name text not null,
                color text not null,
                position double precision not null default 0,
                created_at timestamptz not null default now(),
                updated_at timestamptz not null default now(),
                constraint projects_name_not_empty check (length(name) > 0),
                constraint projects_color_valid
                    check (color in ('blue', 'mint', 'violet', 'amber', 'pink', 'gray'))
            )"#,
            r#"create index projects_user_id_position on projects (user_id, position)"#,
            // 프로젝트 삭제가 태스크를 지우면 안 된다 — 라벨만 떼어낸다
            r#"create table tasks (
                id uuid primary key,
                user_id uuid not null references users(id) on delete cascade,
                project_id uuid references projects(id) on delete set null,
                title text not null,
                date text not null,
                start_at text not null,
                duration_min integer not null,
                status text not null,
                position double precision not null default 0,
                version integer not null default 1,
                completed_at timestamptz,
                created_at timestamptz not null default now(),
                updated_at timestamptz not null default now(),
                constraint tasks_title_not_empty check (length(title) > 0),
                constraint tasks_date_format check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
                constraint tasks_start_at_format check (start_at ~ '^[0-2][0-9]:[0-5][0-9]$'),
                constraint tasks_duration_min_positive check (duration_min > 0),
                constraint tasks_status_valid check (status in ('todo', 'doing', 'done'))
            )"#,
            // 주간 창 쿼리(user_id + date 범위 + start_at 정렬)를 인덱스 순서 그대로 커버한다
            r#"create index tasks_user_id_date_start_at on tasks (user_id, date, start_at)"#,
            // 프로젝트 보드(프로젝트별 · 상태별 조회) 경로 + project_id FK 검사 커버
            r#"create index tasks_user_id_project_id_status on tasks (user_id, project_id, status)"#,
        ],
    )
    .await
}

/// 0002 — 수동 정렬 키를 float 중간값에서 Figma 방식 fractional index(text)로 전환.
///
/// float는 같은 틈을 ~50번 쪼개면 정밀도가 고갈되지만 문자열 키는 자릿수를
/// 늘리면 되므로 고갈이 없다. 바이트 순서 비교가 전제라 collate "C"를 강제한다.
/// 기존 float 값(전부 기본값 0)은 생성 순서(id = UUIDv7 = 시간순)대로 백필한다.
async fn migration_0002_fractional_position(tx: &mut Transaction<'_, Postgres>) -> Result<(), sqlx::Error> {
    for table in ["projects", "tasks"] {
        sqlx::query(&format!(r#"alter table {table} add column position_key text collate "C""#))
            .execute(&mut **tx)
            .await?;

        // 유저별로 (기존 position, 생성 순서) 순서를 보존하며 키 체인을 생성
        let rows: Vec<(uuid::Uuid, uuid::Uuid)> =
            sqlx::query_as(&format!("select id, user_id from {table} order by user_id, position, id"))
                .fetch_all(&mut **tx)
                .await?;

        let mut current_user: Option<uuid::Uuid> = None;
        let mut last: Option<String> = None;
        for (id, user_id) in rows {
            if current_user != Some(user_id) {
                current_user = Some(user_id);
                last = None;
            }
            let next = order_key_after(last.as_deref());
            sqlx::query(&format!("update {table} set position_key = $1 where id = $2"))
                .bind(&next)
                .bind(id)
                .execute(&mut **tx)
                .await?;
            last = Some(next);
        }

        run(
            tx,
            &[
                &format!("alter table {table} alter column position_key set not null"),
                &format!("alter table {table} drop column position"),
                &format!("alter table {table} rename column position_key to position"),
            ],
        )
        .await?;
    }

    // drop column이 옛 인덱스를 함께 지우므로 새 text 컬럼으로 재생성
    run(tx, &["create index projects_user_id_position on projects (user_id, position)"]).await
}

/// 0003 — 기기 간 델타 동기화 기반.
///
/// - sync_counters: 유저별 단조증가 시퀀스. 모든 쓰기가 여기서 seq를 발급받아
///   행에 찍는다 → 클라이언트는 "커서(마지막으로 본 seq) 이후"만 당겨서 수렴한다.
/// - tasks/projects.sync_seq: 그 행의 마지막 변경 seq. 기존 행은 0으로 백필 —
///   커서는 항상 현재 카운터값에서 시작하므로 0인 행이 델타에 잘못 실릴 일이 없다.
/// - deleted_at(tombstone): 하드 DELETE는 "사라졌다"는 사실이 델타에 안 담기므로
///   소프트 삭제로 전환할 자리. 읽기 경로는 deleted_at IS NULL만 본다.
async fn migration_0003_sync(tx: &mut Transaction<'_, Postgres>) -> Result<(), sqlx::Error> {
    // integer 상한(유저당 21억 쓰기)은 개인 앱 규모에서 도달 불가
    run(
        tx,
        &[r#"create table sync_counters (
            user_id uuid primary key references users(id) on delete cascade,
            seq integer not null default 0
        )"#],
    )
    .await?;

    for table in ["projects", "tasks"] {
        run(
            tx,
            &[
                &format!("alter table {table} add column sync_seq integer not null default 0"),
                &format!("alter table {table} add column deleted_at timestamptz"),
                &format!("create index {table}_user_id_sync_seq on {table} (user_id, sync_seq)"),
            ],
        )
        .await?;
    }
    Ok(())
}

/// 0004 — 세션 테이블을 리프레시 토큰 저장소로 전환.
///
/// 액세스(JWT, 무상태) + 리프레시(회전) 모델로 바뀌며 저장소는 리프레시 토큰만 관리한다.
async fn migration_0004_refresh_tokens(tx: &mut Transaction<'_, Postgres>) -> Result<(), sqlx::Error> {
    run(
        tx,
        &[
            "alter table sessions rename to refresh_tokens",
            "alter table refresh_tokens add column absolute_expires_at timestamptz",
            // 기존 행의 하드캡은 idle 만료값으로 백필한 뒤 NOT NULL을 건다.
            "update refresh_tokens set absolute_expires_at = expires_at where absolute_expires_at is null",
            "alter table refresh_tokens alter column absolute_expires_at set not null",
        ],
    )
    .await
}

/// 0005 — 리프레시 토큰 회전 재사용 탐지(OAuth 2.0 BCP).
///
/// 인증 모델 자체가 바뀌어(불투명 세션 → 액세스/리프레시) 기존 토큰은 어차피 무효다.
/// 기존 행을 지우고 family_id를 NOT NULL로 추가한다 — 전환 시 전원 재로그인.
async fn migration_0005_reuse_detection(tx: &mut Transaction<'_, Postgres>) -> Result<(), sqlx::Error> {
    run(
        tx,
        &[
            "delete from refresh_tokens",
            "alter table refresh_tokens add column family_id uuid not null",
            "alter table refresh_tokens add column superseded_at timestamptz",
            // 재사용 탐지 시 계보 전체를 지우는 경로
            "create index refresh_tokens_family_id on refresh_tokens (family_id)",
        ],
    )
    .await
}

/// 0006 — 회전 계보(family)를 표준 용어 세션(session)으로 정정.
///
/// OAuth 회전 계보 = 하나의 로그인 세션이다. 액세스 JWT의 `sid`(OIDC 세션 id 클레임)와
/// 개념을 일치시켜 family_id → session_id로 컬럼·인덱스를 이름만 바꾼다(데이터 변화 없음).
async fn migration_0006_session_id(tx: &mut Transaction<'_, Postgres>) -> Result<(), sqlx::Error> {
    run(
        tx,
        &[
            "alter table refresh_tokens rename column family_id to session_id",
            "drop index refresh_tokens_family_id",
            "create index refresh_tokens_session_id on refresh_tokens (session_id)",
        ],
    )
    .await
}
