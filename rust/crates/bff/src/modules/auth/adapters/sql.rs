use async_trait::async_trait;
use chrono::{DateTime, TimeZone, Utc};
use sqlx::PgPool;
use tooday_shared::User;

use crate::modules::auth::ports::{CreateUserInput, Credentials, RefreshToken, RefreshTokenStore, UserStore};
use crate::modules::auth::refresh_token::{generate_refresh_token, hash_refresh_token};
use crate::platform::errors::{domain, DomainErrorCode, StoreError, StoreResult};
use crate::platform::ids::new_id;
use crate::platform::password::{hash_password, verify_password};

fn to_millis(value: DateTime<Utc>) -> i64 {
    value.timestamp_millis()
}

fn from_millis(value: i64) -> DateTime<Utc> {
    Utc.timestamp_millis_opt(value).single().unwrap_or_else(Utc::now)
}

pub struct SqlUserStore {
    pool: PgPool,
}

impl SqlUserStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserStore for SqlUserStore {
    async fn create(&self, input: CreateUserInput) -> StoreResult<User> {
        let normalized_email = input.email.trim().to_lowercase();
        let existing: Option<(uuid::Uuid,)> = sqlx::query_as("select id from users where email = $1")
            .bind(&normalized_email)
            .fetch_optional(&self.pool)
            .await
            .map_err(StoreError::infrastructure)?;
        if existing.is_some() {
            return domain(DomainErrorCode::EmailTaken);
        }

        let user = User { id: new_id(), email: normalized_email, name: input.name };
        let inserted =
            sqlx::query("insert into users (id, email, name, password_hash) values ($1::uuid, $2, $3, $4)")
                .bind(&user.id)
                .bind(&user.email)
                .bind(&user.name)
                .bind(hash_password(&input.password)?)
                .execute(&self.pool)
                .await;

        match inserted {
            Ok(_) => Ok(user),
            // 유니크 제약 위반 = 조회와 삽입 사이에 다른 요청이 먼저 가입한 것
            Err(sqlx::Error::Database(error)) if error.is_unique_violation() => {
                domain(DomainErrorCode::EmailTaken)
            }
            Err(error) => Err(StoreError::infrastructure(error)),
        }
    }

    async fn verify_credentials(&self, input: Credentials) -> StoreResult<Option<User>> {
        let row: Option<(uuid::Uuid, String, String, String)> =
            sqlx::query_as("select id, email, name, password_hash from users where email = $1")
                .bind(input.email.trim().to_lowercase())
                .fetch_optional(&self.pool)
                .await
                .map_err(StoreError::infrastructure)?;
        let Some((id, email, name, password_hash)) = row else { return Ok(None) };
        Ok(verify_password(&input.password, &password_hash)?.then(|| User {
            id: id.to_string(),
            email,
            name,
        }))
    }
}

pub struct SqlRefreshTokenStore {
    pool: PgPool,
    idle_ttl_ms: i64,
    absolute_ttl_ms: i64,
}

impl SqlRefreshTokenStore {
    pub fn new(pool: PgPool, idle_ttl_ms: i64, absolute_ttl_ms: i64) -> Self {
        Self { pool, idle_ttl_ms, absolute_ttl_ms }
    }

    async fn revoke_session(&self, session_id: &uuid::Uuid) -> StoreResult<()> {
        sqlx::query("delete from refresh_tokens where session_id = $1")
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(StoreError::infrastructure)?;
        Ok(())
    }
}

#[async_trait]
impl RefreshTokenStore for SqlRefreshTokenStore {
    async fn issue(&self, user_id: &str) -> StoreResult<RefreshToken> {
        let now = Utc::now().timestamp_millis();
        let token = RefreshToken {
            token: generate_refresh_token(),
            user_id: user_id.to_owned(),
            session_id: new_id(),
            expires_at: now + self.idle_ttl_ms,
            absolute_expires_at: now + self.absolute_ttl_ms,
        };
        sqlx::query(
            r#"insert into refresh_tokens
               (token_hash, user_id, session_id, expires_at, absolute_expires_at, superseded_at)
               values ($1, $2::uuid, $3::uuid, $4, $5, null)"#,
        )
        .bind(hash_refresh_token(&token.token))
        .bind(&token.user_id)
        .bind(&token.session_id)
        .bind(from_millis(token.expires_at))
        .bind(from_millis(token.absolute_expires_at))
        .execute(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;
        Ok(token)
    }

    async fn rotate(&self, token: &str) -> StoreResult<Option<RefreshToken>> {
        let now = Utc::now().timestamp_millis();
        let token_hash = hash_refresh_token(token);
        let row: Option<(uuid::Uuid, uuid::Uuid, DateTime<Utc>, DateTime<Utc>, Option<DateTime<Utc>>)> =
            sqlx::query_as(
                r#"select user_id, session_id, expires_at, absolute_expires_at, superseded_at
                   from refresh_tokens where token_hash = $1"#,
            )
            .bind(&token_hash)
            .fetch_optional(&self.pool)
            .await
            .map_err(StoreError::infrastructure)?;
        let Some((user_id, session_id, expires_at, absolute_expires_at, superseded_at)) = row else {
            return Ok(None);
        };

        // 이미 회전된(supersede된) 토큰의 재제시 = 탈취 신호 → 세션 전체 무효화.
        if superseded_at.is_some() {
            self.revoke_session(&session_id).await?;
            return Ok(None);
        }
        if to_millis(expires_at) <= now || to_millis(absolute_expires_at) <= now {
            sqlx::query("delete from refresh_tokens where token_hash = $1")
                .bind(&token_hash)
                .execute(&self.pool)
                .await
                .map_err(StoreError::infrastructure)?;
            return Ok(None);
        }

        // idle는 슬라이딩(now+idle)하되 absolute 캡을 넘지 못한다. 세션은 유지.
        let next = RefreshToken {
            token: generate_refresh_token(),
            user_id: user_id.to_string(),
            session_id: session_id.to_string(),
            expires_at: (now + self.idle_ttl_ms).min(to_millis(absolute_expires_at)),
            absolute_expires_at: to_millis(absolute_expires_at),
        };

        // 옛 토큰 supersede 마킹 + 새 토큰 발급을 한 트랜잭션으로 — 회전은 원자적이어야 한다.
        // (옛 토큰은 지우지 않고 남겨 재사용 탐지에 쓰고, 만료 시 스윕이 청소한다.)
        let mut tx = self.pool.begin().await.map_err(StoreError::infrastructure)?;
        // 같은 토큰으로 두 요청이 동시에 회전하면 하나만 이겨야 한다 — 조건부 UPDATE로 직렬화한다
        let marked = sqlx::query(
            "update refresh_tokens set superseded_at = $1 where token_hash = $2 and superseded_at is null",
        )
        .bind(from_millis(now))
        .bind(&token_hash)
        .execute(&mut *tx)
        .await
        .map_err(StoreError::infrastructure)?;
        if marked.rows_affected() == 0 {
            tx.rollback().await.map_err(StoreError::infrastructure)?;
            // 경합에서 진 쪽 — 상대가 이미 supersede 했으므로 재사용과 같게 취급한다
            self.revoke_session(&session_id).await?;
            return Ok(None);
        }
        sqlx::query(
            r#"insert into refresh_tokens
               (token_hash, user_id, session_id, expires_at, absolute_expires_at, superseded_at)
               values ($1, $2::uuid, $3::uuid, $4, $5, null)"#,
        )
        .bind(hash_refresh_token(&next.token))
        .bind(&next.user_id)
        .bind(&next.session_id)
        .bind(from_millis(next.expires_at))
        .bind(from_millis(next.absolute_expires_at))
        .execute(&mut *tx)
        .await
        .map_err(StoreError::infrastructure)?;
        tx.commit().await.map_err(StoreError::infrastructure)?;
        Ok(Some(next))
    }

    async fn revoke(&self, token: &str) -> StoreResult<()> {
        let row: Option<(uuid::Uuid,)> =
            sqlx::query_as("select session_id from refresh_tokens where token_hash = $1")
                .bind(hash_refresh_token(token))
                .fetch_optional(&self.pool)
                .await
                .map_err(StoreError::infrastructure)?;
        if let Some((session_id,)) = row {
            self.revoke_session(&session_id).await?;
        }
        Ok(())
    }

    async fn is_session_live(&self, session_id: &str) -> StoreResult<bool> {
        // 세션은 자기 리프레시 토큰으로 존재한다 — 폐기되면 행이 사라지고, absolute면 만료된다.
        let row: Option<(String,)> = sqlx::query_as(
            "select token_hash from refresh_tokens where session_id = $1::uuid and absolute_expires_at > now() limit 1",
        )
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;
        Ok(row.is_some())
    }

    async fn delete_expired(&self) -> StoreResult<u64> {
        let result = sqlx::query(
            "delete from refresh_tokens where expires_at <= now() or absolute_expires_at <= now()",
        )
        .execute(&self.pool)
        .await
        .map_err(StoreError::infrastructure)?;
        Ok(result.rows_affected())
    }
}
