use anyhow::Context;
use deadpool_postgres::Pool;

/// push-server 소유 테이블의 버전드 마이그레이션 — 부팅 시 적용한다.
///
/// BFF와 DB는 공유하지만 스키마 소유는 분리한다: BFF 테이블(users/tasks …)은
/// BFF의 Kysely 마이그레이션이, 푸시 테이블은 여기가 관리한다. 같은 이유로
/// BFF 테이블에 FK를 걸지 않는다 — 서비스 간 DDL 의존(부팅 순서·이름 변경 파급)을
/// 만들지 않기 위해서다. 고아 행은 무해하다: task_push_sends는 dedup 로그일 뿐이고,
/// 삭제된 유저의 구독은 due 태스크 조인으로 선택될 일이 없다.
const MIGRATIONS: &[(&str, &str)] = &[(
    "0001_init",
    "create table push_subscriptions ( \
       token text primary key, \
       user_id uuid not null, \
       platform text not null check (platform in ('expo', 'fcm', 'apns', 'webpush')), \
       created_at timestamptz not null default now() \
     ); \
     create index push_subscriptions_user_id on push_subscriptions (user_id); \
     create table task_push_sends ( \
       task_id uuid not null, \
       scheduled_date text not null, \
       scheduled_start_at text not null, \
       sent_at timestamptz not null default now(), \
       primary key (task_id, scheduled_date, scheduled_start_at) \
     );",
)];

/// pg_advisory_lock 키 — push-server 마이그레이션 전용 (임의의 고정값).
const MIGRATION_LOCK_KEY: i64 = 0x746f_6f64_6179_7073; // "toodayps"

pub async fn apply(pool: &Pool) -> anyhow::Result<()> {
    let client = pool.get().await.context("PostgreSQL 접속 실패")?;

    // 인스턴스가 여러 대 동시에 부팅해도 한 대만 적용한다. 세션 락이므로
    // 이 커넥션이 살아 있는 동안만 유지된다 — 함수 끝에서 명시 해제한다.
    client
        .execute("select pg_advisory_lock($1)", &[&MIGRATION_LOCK_KEY])
        .await?;
    let result = apply_locked(&client).await;
    client
        .execute("select pg_advisory_unlock($1)", &[&MIGRATION_LOCK_KEY])
        .await?;
    result
}

async fn apply_locked(client: &deadpool_postgres::Client) -> anyhow::Result<()> {
    client
        .batch_execute(
            "create table if not exists push_server_migrations ( \
               name text primary key, \
               applied_at timestamptz not null default now() \
             )",
        )
        .await?;

    for (name, ddl) in MIGRATIONS {
        let already = client
            .query_opt(
                "select 1 from push_server_migrations where name = $1",
                &[name],
            )
            .await?
            .is_some();
        if already {
            continue;
        }
        // DDL + 이력 기록을 한 트랜잭션으로 — 중간 실패 시 둘 다 남지 않는다.
        client
            .batch_execute(&format!(
                "begin; {ddl} insert into push_server_migrations (name) values ('{name}'); commit;"
            ))
            .await
            .with_context(|| format!("마이그레이션 {name} 적용 실패"))?;
        tracing::info!(migration = name, "마이그레이션 적용");
    }
    Ok(())
}
