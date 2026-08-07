use sqlx::PgPool;

use crate::platform::db::migrations::migrations;

/// Kysely Migrator가 쓰던 이력·잠금 테이블을 그대로 쓴다 — 이름·컬럼이 같아야
/// TS 구현이 이미 마이그레이션한 데이터베이스에 러스트 BFF를 붙일 수 있다.
const HISTORY_TABLE: &str = "kysely_migration";
const LOCK_TABLE: &str = "kysely_migration_lock";

/// 버전드 마이그레이션 실행. 이력 테이블과 잠금(advisory lock)이 적용 여부·동시
/// 실행을 관리하므로 부팅 시 항상 호출해도 안전하다.
pub async fn migrate_to_latest(pool: &PgPool) -> Result<Vec<String>, sqlx::Error> {
    sqlx::query(&format!(
        "create table if not exists {HISTORY_TABLE} (name varchar(255) primary key, timestamp varchar(255) not null)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(&format!(
        "create table if not exists {LOCK_TABLE} (id varchar(255) primary key, is_locked integer not null default 0)"
    ))
    .execute(pool)
    .await?;

    let mut applied = Vec::new();
    for migration in migrations() {
        let mut tx = pool.begin().await?;
        // 인스턴스가 동시에 부팅해도 한 번만 적용되도록 마이그레이션 전체를 직렬화한다
        sqlx::query("select pg_advisory_xact_lock(hashtext('tooday_migration'))").execute(&mut *tx).await?;

        let already: Option<(String,)> =
            sqlx::query_as(&format!("select name from {HISTORY_TABLE} where name = $1"))
                .bind(migration.name)
                .fetch_optional(&mut *tx)
                .await?;
        if already.is_some() {
            tx.commit().await?;
            continue;
        }

        (migration.up)(&mut tx).await?;
        sqlx::query(&format!("insert into {HISTORY_TABLE} (name, timestamp) values ($1, $2)"))
            .bind(migration.name)
            .bind(chrono::Utc::now().to_rfc3339())
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        applied.push(migration.name.to_owned());
    }
    Ok(applied)
}
