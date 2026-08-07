use async_trait::async_trait;
use sqlx::PgPool;
use tooday_shared::User;

use crate::modules::user::ports::UserReader;
use crate::platform::errors::{StoreError, StoreResult};

/// 읽기 전용 — users 테이블 쓰기는 auth 모듈의 `SqlUserStore`만 한다
pub struct SqlUserReader {
    pool: PgPool,
}

impl SqlUserReader {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserReader for SqlUserReader {
    async fn find_by_id(&self, id: &str) -> StoreResult<Option<User>> {
        let row: Option<(uuid::Uuid, String, String)> =
            sqlx::query_as("select id, email, name from users where id = $1::uuid")
                .bind(id)
                .fetch_optional(&self.pool)
                .await
                .map_err(StoreError::infrastructure)?;
        Ok(row.map(|(id, email, name)| User { id: id.to_string(), email, name }))
    }
}
