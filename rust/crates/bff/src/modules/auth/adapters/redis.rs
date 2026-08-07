//! `RefreshTokenStore`의 Redis 어댑터.
//!
//! - idle(슬라이딩)은 `SET ... PX`의 네이티브 TTL. 회전 시 키를 새로 쓰며 PX를 다시 건다.
//! - absolute(하드캡)는 값의 absoluteExpiresAt. 키 TTL이 이 상한을 넘지 않도록 매번 캡한다.
//! - 재사용 탐지: 세션별 토큰 해시 SET(session:*)을 유지해, 이미 supersede된 토큰이
//!   다시 제시되면 그 SET으로 세션 전체를 일괄 삭제한다.
//! - 만료 키는 Redis가 자동 evict하므로 `delete_expired` 수동 스윕이 필요 없다(no-op).
//!
//! 토큰 원문 대신 해시를 키로 쓴다 — Redis 유출이 세션 탈취로 이어지지 않게 한다.

use async_trait::async_trait;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};

use crate::modules::auth::ports::{RefreshToken, RefreshTokenStore};
use crate::modules::auth::refresh_token::{generate_refresh_token, hash_refresh_token};
use crate::platform::errors::{StoreError, StoreResult};
use crate::platform::ids::new_id;

/// 토큰 키에 저장하는 값. idle 만료는 키의 네이티브 TTL(PX)이 표현하므로 값에 담지 않고,
/// 회전해도 안 늘어나는 절대 만료(하드캡)와 세션 식별자·supersede 여부만 값으로 들고 다닌다.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredToken {
    #[serde(rename = "userId")]
    user_id: String,
    #[serde(rename = "sessionId")]
    session_id: String,
    #[serde(rename = "absoluteExpiresAt")]
    absolute_expires_at: i64,
    /// 회전으로 폐기됨(재사용 탐지 대상). 활성 토큰은 false.
    superseded: bool,
}

const TOKEN_PREFIX: &str = "refresh:";
const SESSION_PREFIX: &str = "session:";

pub struct RedisRefreshTokenStore {
    client: redis::Client,
    idle_ttl_ms: i64,
    absolute_ttl_ms: i64,
}

impl RedisRefreshTokenStore {
    pub fn new(url: &str, idle_ttl_ms: i64, absolute_ttl_ms: i64) -> Result<Self, redis::RedisError> {
        Ok(Self { client: redis::Client::open(url)?, idle_ttl_ms, absolute_ttl_ms })
    }

    async fn connection(&self) -> StoreResult<redis::aio::MultiplexedConnection> {
        self.client.get_multiplexed_async_connection().await.map_err(StoreError::infrastructure)
    }

    fn token_key(token: &str) -> String {
        format!("{TOKEN_PREFIX}{}", hash_refresh_token(token))
    }

    fn session_key(session_id: &str) -> String {
        format!("{SESSION_PREFIX}{session_id}")
    }

    async fn revoke_session(
        connection: &mut redis::aio::MultiplexedConnection,
        session_id: &str,
    ) -> StoreResult<()> {
        let hashes: Vec<String> = connection
            .smembers(Self::session_key(session_id))
            .await
            .map_err(StoreError::infrastructure)?;
        let keys: Vec<String> = hashes.into_iter().map(|hash| format!("{TOKEN_PREFIX}{hash}")).collect();
        if !keys.is_empty() {
            let _: () = connection.del(keys).await.map_err(StoreError::infrastructure)?;
        }
        let _: () = connection
            .del(Self::session_key(session_id))
            .await
            .map_err(StoreError::infrastructure)?;
        Ok(())
    }

    /// 새 토큰을 발급해 idle TTL(absolute 캡)로 저장하고 세션 SET에 등록한다
    /// — issue와 rotate의 공통 경로.
    async fn write(
        &self,
        connection: &mut redis::aio::MultiplexedConnection,
        user_id: &str,
        session_id: &str,
        absolute_expires_at: i64,
        now: i64,
    ) -> StoreResult<RefreshToken> {
        let token = generate_refresh_token();
        let hash = hash_refresh_token(&token);
        // idle은 슬라이딩하되 키가 absolute 상한을 넘겨 살아있지 않도록 캡한다.
        let px_ms = self.idle_ttl_ms.min(absolute_expires_at - now).max(1);
        let value = StoredToken {
            user_id: user_id.to_owned(),
            session_id: session_id.to_owned(),
            absolute_expires_at,
            superseded: false,
        };
        let _: () = connection
            .pset_ex(
                format!("{TOKEN_PREFIX}{hash}"),
                serde_json::to_string(&value).expect("StoredToken 직렬화"),
                px_ms as u64,
            )
            .await
            .map_err(StoreError::infrastructure)?;
        // 세션 SET에 등록하고, SET이 absolute까지는 살아있도록 TTL을 남은 absolute로 맞춘다.
        let _: () = connection
            .sadd(Self::session_key(session_id), &hash)
            .await
            .map_err(StoreError::infrastructure)?;
        let _: () = connection
            .pexpire(Self::session_key(session_id), (absolute_expires_at - now).max(1))
            .await
            .map_err(StoreError::infrastructure)?;
        Ok(RefreshToken {
            token,
            user_id: user_id.to_owned(),
            session_id: session_id.to_owned(),
            expires_at: now + px_ms,
            absolute_expires_at,
        })
    }
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

#[async_trait]
impl RefreshTokenStore for RedisRefreshTokenStore {
    async fn issue(&self, user_id: &str) -> StoreResult<RefreshToken> {
        let now = now_ms();
        let mut connection = self.connection().await?;
        self.write(&mut connection, user_id, &new_id(), now + self.absolute_ttl_ms, now).await
    }

    async fn rotate(&self, token: &str) -> StoreResult<Option<RefreshToken>> {
        let now = now_ms();
        let mut connection = self.connection().await?;
        let raw: Option<String> =
            connection.get(Self::token_key(token)).await.map_err(StoreError::infrastructure)?;
        // 키가 없으면 idle 만료(네이티브 evict)이거나 폐기됨.
        let Some(raw) = raw else { return Ok(None) };
        let stored: StoredToken =
            serde_json::from_str(&raw).map_err(StoreError::infrastructure)?;

        // 이미 회전된(supersede된) 토큰의 재제시 = 탈취 신호 → 세션 전체 무효화.
        if stored.superseded || stored.absolute_expires_at <= now {
            Self::revoke_session(&mut connection, &stored.session_id).await?;
            return Ok(None);
        }

        // 옛 토큰은 지우지 않고 supersede 마킹만(남은 TTL 유지 → 재사용 탐지 창),
        // 새 토큰은 같은 세션으로.
        let remaining_ms: i64 =
            connection.pttl(Self::token_key(token)).await.map_err(StoreError::infrastructure)?;
        let superseded = StoredToken { superseded: true, ..stored.clone() };
        let _: () = connection
            .pset_ex(
                Self::token_key(token),
                serde_json::to_string(&superseded).expect("StoredToken 직렬화"),
                remaining_ms.max(1) as u64,
            )
            .await
            .map_err(StoreError::infrastructure)?;

        self.write(
            &mut connection,
            &stored.user_id,
            &stored.session_id,
            stored.absolute_expires_at,
            now,
        )
        .await
        .map(Some)
    }

    async fn revoke(&self, token: &str) -> StoreResult<()> {
        let mut connection = self.connection().await?;
        let raw: Option<String> =
            connection.get(Self::token_key(token)).await.map_err(StoreError::infrastructure)?;
        let Some(raw) = raw else { return Ok(()) };
        let stored: StoredToken =
            serde_json::from_str(&raw).map_err(StoreError::infrastructure)?;
        Self::revoke_session(&mut connection, &stored.session_id).await
    }

    async fn is_session_live(&self, session_id: &str) -> StoreResult<bool> {
        // 세션 SET은 TTL=absolute라 폐기(del) 또는 absolute 만료 시 사라진다 → EXISTS 한 번으로 판정.
        let mut connection = self.connection().await?;
        connection
            .exists(Self::session_key(session_id))
            .await
            .map_err(StoreError::infrastructure)
    }

    async fn delete_expired(&self) -> StoreResult<u64> {
        // 네이티브 TTL이 idle 만료 키를 자동 evict하고, PX를 absolute로 캡하므로 청소 대상이 없다.
        Ok(0)
    }
}
