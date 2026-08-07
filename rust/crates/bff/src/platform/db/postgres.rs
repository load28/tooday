use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

/// 배포 경로 — 커넥션 풀 기반 PostgreSQL. DATABASE_URL로 선택된다.
pub async fn create_postgres_pool(url: &str, pool_size: u32) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new().max_connections(pool_size).connect(url).await
}
