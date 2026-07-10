//! 리프레시 토큰 저장소 — 회전(idle 슬라이딩 + absolute 하드캡) + 재사용 탐지.
//!
//! BFF 시절의 SQL(`adapters/sql.ts`)·Redis(`adapters/redis.ts`) 어댑터 의미를 그대로
//! 이관했다. Redis 키·값 형식(`refresh:<sha256>` / `session:<sid>` / camelCase JSON)도
//! 동일해 마이그레이션 시 기존 세션이 살아남는다.

use chrono::{DateTime, Utc};
use rand::RngCore;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::ApiConfig;
use crate::error::{ApiError, ApiResult};
use crate::ids::new_id;

pub fn generate_refresh_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

/// 저장용 해시 — 토큰 원문은 클라이언트만 가진다. 저장소 유출이 세션 탈취로 이어지지 않게 한다.
pub fn hash_refresh_token(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

pub struct RefreshToken {
    /// 원문 — 클라이언트만 가진다. 저장소에는 해시로만 남는다.
    pub token: String,
    pub user_id: Uuid,
    /// 회전 세션 식별자(sid) — 로그인 시 하나 발급, 회전해도 유지된다. 재사용 탐지 단위.
    pub session_id: Uuid,
}

/// 백엔드 선택을 한 곳에 모은 열거 저장소 — REDIS_URL 설정 시 Redis, 아니면 DB 테이블.
#[derive(Clone)]
pub enum RefreshStore {
    Pg(PgRefreshStore),
    Redis(RedisRefreshStore),
}

pub async fn create_store(config: &ApiConfig, pool: PgPool) -> Result<RefreshStore, redis::RedisError> {
    match &config.redis_url {
        Some(url) => {
            let client = redis::Client::open(url.as_str())?;
            let connection = redis::aio::ConnectionManager::new(client).await?;
            Ok(RefreshStore::Redis(RedisRefreshStore {
                redis: connection,
                idle_ttl_ms: config.refresh_idle_ttl_ms as i64,
                absolute_ttl_ms: config.refresh_absolute_ttl_ms as i64,
            }))
        }
        None => Ok(RefreshStore::Pg(PgRefreshStore {
            pool,
            idle_ttl_ms: config.refresh_idle_ttl_ms as i64,
            absolute_ttl_ms: config.refresh_absolute_ttl_ms as i64,
        })),
    }
}

pub trait RefreshTokenStore {
    /// 로그인/회원가입 — 새 세션의 리프레시 토큰. absolute 캡을 지금부터 건다.
    fn issue(&self, user_id: Uuid) -> impl std::future::Future<Output = ApiResult<RefreshToken>> + Send;
    /// 회전 — 유효하면 옛 토큰을 supersede하고 같은 세션의 새 토큰. 재사용 탐지 시 세션 무효화 후 None.
    fn rotate(&self, token: &str) -> impl std::future::Future<Output = ApiResult<Option<RefreshToken>>> + Send;
    /// 로그아웃 — 해당 토큰이 속한 세션 전체를 폐기
    fn revoke(&self, token: &str) -> impl std::future::Future<Output = ApiResult<()>> + Send;
    /// 세션 라이브니스 — 무상태 액세스에 즉시 무효화를 부여하는 유일한 지점
    fn is_session_live(&self, session_id: &str) -> impl std::future::Future<Output = ApiResult<bool>> + Send;
    /// 만료(idle/absolute) 토큰 청소 배치 — 삭제한 행 수
    fn delete_expired(&self) -> impl std::future::Future<Output = ApiResult<u64>> + Send;
}

impl RefreshStore {
    pub fn needs_expiry_sweep(&self) -> bool {
        // Redis는 네이티브 TTL이 자동 evict하므로 스윕이 필요 없다.
        matches!(self, Self::Pg(_))
    }

    pub fn backend_name(&self) -> &'static str {
        match self {
            Self::Pg(_) => "sql",
            Self::Redis(_) => "redis",
        }
    }
}

impl RefreshTokenStore for RefreshStore {
    async fn issue(&self, user_id: Uuid) -> ApiResult<RefreshToken> {
        match self {
            Self::Pg(store) => store.issue(user_id).await,
            Self::Redis(store) => store.issue(user_id).await,
        }
    }

    async fn rotate(&self, token: &str) -> ApiResult<Option<RefreshToken>> {
        match self {
            Self::Pg(store) => store.rotate(token).await,
            Self::Redis(store) => store.rotate(token).await,
        }
    }

    async fn revoke(&self, token: &str) -> ApiResult<()> {
        match self {
            Self::Pg(store) => store.revoke(token).await,
            Self::Redis(store) => store.revoke(token).await,
        }
    }

    async fn is_session_live(&self, session_id: &str) -> ApiResult<bool> {
        match self {
            Self::Pg(store) => store.is_session_live(session_id).await,
            Self::Redis(store) => store.is_session_live(session_id).await,
        }
    }

    async fn delete_expired(&self) -> ApiResult<u64> {
        match self {
            Self::Pg(store) => store.delete_expired().await,
            Self::Redis(store) => store.delete_expired().await,
        }
    }
}

// ── SQL 백엔드 ──────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct PgRefreshStore {
    pool: PgPool,
    idle_ttl_ms: i64,
    absolute_ttl_ms: i64,
}

impl PgRefreshStore {
    async fn revoke_session(&self, session_id: Uuid) -> ApiResult<()> {
        sqlx::query("delete from refresh_tokens where session_id = $1")
            .bind(session_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

impl RefreshTokenStore for PgRefreshStore {
    async fn issue(&self, user_id: Uuid) -> ApiResult<RefreshToken> {
        let now = Utc::now();
        let token = RefreshToken { token: generate_refresh_token(), user_id, session_id: new_id() };
        sqlx::query(
            "insert into refresh_tokens (token_hash, user_id, session_id, expires_at, absolute_expires_at, superseded_at)
             values ($1, $2, $3, $4, $5, null)",
        )
        .bind(hash_refresh_token(&token.token))
        .bind(token.user_id)
        .bind(token.session_id)
        .bind(now + chrono::Duration::milliseconds(self.idle_ttl_ms))
        .bind(now + chrono::Duration::milliseconds(self.absolute_ttl_ms))
        .execute(&self.pool)
        .await?;
        Ok(token)
    }

    async fn rotate(&self, token: &str) -> ApiResult<Option<RefreshToken>> {
        let now = Utc::now();
        let hash = hash_refresh_token(token);
        let row: Option<(Uuid, Uuid, DateTime<Utc>, DateTime<Utc>, Option<DateTime<Utc>>)> = sqlx::query_as(
            "select user_id, session_id, expires_at, absolute_expires_at, superseded_at
             from refresh_tokens where token_hash = $1",
        )
        .bind(&hash)
        .fetch_optional(&self.pool)
        .await?;
        let Some((user_id, session_id, expires_at, absolute_expires_at, superseded_at)) = row else {
            return Ok(None);
        };

        // 이미 회전된(supersede된) 토큰의 재제시 = 탈취 신호 → 세션 전체 무효화.
        if superseded_at.is_some() {
            self.revoke_session(session_id).await?;
            return Ok(None);
        }

        if expires_at <= now || absolute_expires_at <= now {
            sqlx::query("delete from refresh_tokens where token_hash = $1")
                .bind(&hash)
                .execute(&self.pool)
                .await?;
            return Ok(None);
        }

        // idle는 슬라이딩(now+idle)하되 absolute 캡을 넘지 못한다. 세션은 유지.
        let next = RefreshToken { token: generate_refresh_token(), user_id, session_id };
        let next_expires_at = (now + chrono::Duration::milliseconds(self.idle_ttl_ms)).min(absolute_expires_at);
        // 옛 토큰 supersede 마킹 + 새 토큰 발급을 한 트랜잭션으로 — 회전은 원자적이어야 한다.
        // (옛 토큰은 지우지 않고 남겨 재사용 탐지에 쓰고, 만료 시 스윕이 청소한다.)
        let mut tx = self.pool.begin().await?;
        sqlx::query("update refresh_tokens set superseded_at = $1 where token_hash = $2")
            .bind(now)
            .bind(&hash)
            .execute(&mut *tx)
            .await?;
        sqlx::query(
            "insert into refresh_tokens (token_hash, user_id, session_id, expires_at, absolute_expires_at, superseded_at)
             values ($1, $2, $3, $4, $5, null)",
        )
        .bind(hash_refresh_token(&next.token))
        .bind(next.user_id)
        .bind(next.session_id)
        .bind(next_expires_at)
        .bind(absolute_expires_at)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
        Ok(Some(next))
    }

    async fn revoke(&self, token: &str) -> ApiResult<()> {
        let row: Option<(Uuid,)> = sqlx::query_as("select session_id from refresh_tokens where token_hash = $1")
            .bind(hash_refresh_token(token))
            .fetch_optional(&self.pool)
            .await?;
        if let Some((session_id,)) = row {
            self.revoke_session(session_id).await?;
        }
        Ok(())
    }

    async fn is_session_live(&self, session_id: &str) -> ApiResult<bool> {
        // 세션은 자기 리프레시 토큰으로 존재한다 — 폐기되면 행이 사라지고, absolute면 만료된다.
        let Ok(session_id) = Uuid::parse_str(session_id) else {
            return Ok(false);
        };
        let row: Option<(i32,)> = sqlx::query_as(
            "select 1 from refresh_tokens where session_id = $1 and absolute_expires_at > $2 limit 1",
        )
        .bind(session_id)
        .bind(Utc::now())
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.is_some())
    }

    async fn delete_expired(&self) -> ApiResult<u64> {
        let result = sqlx::query("delete from refresh_tokens where expires_at <= $1 or absolute_expires_at <= $1")
            .bind(Utc::now())
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }
}

// ── Redis 백엔드 ────────────────────────────────────────────────────────────

const TOKEN_PREFIX: &str = "refresh:";
const SESSION_PREFIX: &str = "session:";

/// 토큰 키에 저장하는 값 — BFF Redis 어댑터와 동일한 camelCase JSON.
/// idle 만료는 키의 네이티브 TTL(PX)이 표현하므로 값에 담지 않는다.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredToken {
    user_id: Uuid,
    session_id: Uuid,
    absolute_expires_at: i64,
    /// 회전으로 폐기됨(재사용 탐지 대상). 활성 토큰은 false.
    superseded: bool,
}

#[derive(Clone)]
pub struct RedisRefreshStore {
    redis: redis::aio::ConnectionManager,
    idle_ttl_ms: i64,
    absolute_ttl_ms: i64,
}

fn redis_error(error: redis::RedisError) -> ApiError {
    ApiError::Internal(Box::new(error))
}

fn json_error(error: serde_json::Error) -> ApiError {
    ApiError::Internal(Box::new(error))
}

impl RedisRefreshStore {
    fn token_key(token: &str) -> String {
        format!("{TOKEN_PREFIX}{}", hash_refresh_token(token))
    }

    fn session_key(session_id: Uuid) -> String {
        format!("{SESSION_PREFIX}{session_id}")
    }

    async fn revoke_session(&self, session_id: Uuid) -> ApiResult<()> {
        let mut redis = self.redis.clone();
        let session_key = Self::session_key(session_id);
        let hashes: Vec<String> = redis.smembers(&session_key).await.map_err(redis_error)?;
        if !hashes.is_empty() {
            let keys: Vec<String> = hashes.into_iter().map(|hash| format!("{TOKEN_PREFIX}{hash}")).collect();
            let _: i64 = redis.del(keys).await.map_err(redis_error)?;
        }
        let _: i64 = redis.del(&session_key).await.map_err(redis_error)?;
        Ok(())
    }

    /// 새 토큰을 idle TTL(absolute 캡)로 저장하고 세션 SET에 등록 — issue와 rotate의 공통 경로.
    async fn write(&self, user_id: Uuid, session_id: Uuid, absolute_expires_at: i64, now: i64) -> ApiResult<RefreshToken> {
        let token = generate_refresh_token();
        let hash = hash_refresh_token(&token);
        // idle은 슬라이딩하되 키가 absolute 상한을 넘겨 살아있지 않도록 캡한다.
        let px_ms = self.idle_ttl_ms.min(absolute_expires_at - now).max(1);
        let value = serde_json::to_string(&StoredToken { user_id, session_id, absolute_expires_at, superseded: false })
            .map_err(json_error)?;
        let mut redis = self.redis.clone();
        let _: () = redis::cmd("SET")
            .arg(format!("{TOKEN_PREFIX}{hash}"))
            .arg(&value)
            .arg("PX")
            .arg(px_ms)
            .query_async(&mut redis)
            .await
            .map_err(redis_error)?;
        // 세션 SET에 등록하고, SET이 absolute까지는 살아있도록 TTL을 남은 absolute로 맞춘다.
        let session_key = Self::session_key(session_id);
        let _: i64 = redis.sadd(&session_key, &hash).await.map_err(redis_error)?;
        let _: bool = redis.pexpire(&session_key, (absolute_expires_at - now).max(1)).await.map_err(redis_error)?;
        Ok(RefreshToken { token, user_id, session_id })
    }
}

impl RefreshTokenStore for RedisRefreshStore {
    async fn issue(&self, user_id: Uuid) -> ApiResult<RefreshToken> {
        let now = Utc::now().timestamp_millis();
        self.write(user_id, new_id(), now + self.absolute_ttl_ms, now).await
    }

    async fn rotate(&self, token: &str) -> ApiResult<Option<RefreshToken>> {
        let now = Utc::now().timestamp_millis();
        let mut redis = self.redis.clone();
        let key = Self::token_key(token);
        // 키가 없으면 idle 만료(네이티브 evict)이거나 폐기됨.
        let raw: Option<String> = redis.get(&key).await.map_err(redis_error)?;
        let Some(raw) = raw else {
            return Ok(None);
        };
        let stored: StoredToken = serde_json::from_str(&raw).map_err(json_error)?;

        // 이미 회전된(supersede된) 토큰의 재제시 = 탈취 신호 → 세션 전체 무효화.
        if stored.superseded {
            self.revoke_session(stored.session_id).await?;
            return Ok(None);
        }
        if stored.absolute_expires_at <= now {
            self.revoke_session(stored.session_id).await?;
            return Ok(None);
        }

        // 옛 토큰은 지우지 않고 supersede 마킹만(남은 TTL 유지 → 재사용 탐지 창), 새 토큰은 같은 세션으로.
        let remaining_ms: i64 = redis.pttl(&key).await.map_err(redis_error)?;
        let superseded = serde_json::to_string(&StoredToken { superseded: true, ..stored }).map_err(json_error)?;
        let _: () = redis::cmd("SET")
            .arg(&key)
            .arg(&superseded)
            .arg("PX")
            .arg(remaining_ms.max(1))
            .query_async(&mut redis)
            .await
            .map_err(redis_error)?;
        self.write(stored.user_id, stored.session_id, stored.absolute_expires_at, now)
            .await
            .map(Some)
    }

    async fn revoke(&self, token: &str) -> ApiResult<()> {
        let mut redis = self.redis.clone();
        let raw: Option<String> = redis.get(Self::token_key(token)).await.map_err(redis_error)?;
        let Some(raw) = raw else {
            return Ok(());
        };
        let stored: StoredToken = serde_json::from_str(&raw).map_err(json_error)?;
        self.revoke_session(stored.session_id).await
    }

    async fn is_session_live(&self, session_id: &str) -> ApiResult<bool> {
        // 세션 SET은 TTL=absolute라 폐기(del) 또는 absolute 만료 시 사라진다 → EXISTS 한 번으로 판정.
        let Ok(session_id) = Uuid::parse_str(session_id) else {
            return Ok(false);
        };
        let mut redis = self.redis.clone();
        redis.exists(Self::session_key(session_id)).await.map_err(redis_error)
    }

    async fn delete_expired(&self) -> ApiResult<u64> {
        // 네이티브 TTL이 idle 만료 키를 자동 evict하고, PX를 absolute로 캡하므로 청소 대상이 없다.
        Ok(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refresh_token_is_64_hex_chars() {
        let token = generate_refresh_token();
        assert_eq!(token.len(), 64);
        assert!(token.bytes().all(|b| b.is_ascii_hexdigit()));
        assert_ne!(token, generate_refresh_token());
    }

    /// BFF(Bun.CryptoHasher sha256 hex)와 동일한 해시 — 저장된 기존 토큰 호환
    #[test]
    fn hash_matches_bff_sha256_hex() {
        assert_eq!(
            hash_refresh_token("test-token"),
            "4c5dc9b7708905f77f5e5d16316b5dfb425e68cb326dcd55a860e90a7707031e",
        );
    }
}
