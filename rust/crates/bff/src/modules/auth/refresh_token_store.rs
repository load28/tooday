use std::sync::Arc;

use sqlx::PgPool;

use crate::modules::auth::adapters::memory::InMemoryRefreshTokenStore;
use crate::modules::auth::adapters::redis::RedisRefreshTokenStore;
use crate::modules::auth::adapters::sql::SqlRefreshTokenStore;
use crate::modules::auth::ports::RefreshTokenStore;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RefreshTokenBackend {
    Redis,
    Sql,
    /// DB가 없는 개발·테스트 경로 — 프로세스 메모리
    Memory,
}

pub struct RefreshTokenStoreBundle {
    pub store: Arc<dyn RefreshTokenStore>,
    pub backend: RefreshTokenBackend,
    /// 앱이 주기적으로 만료 토큰을 청소해야 하는가.
    /// Redis는 네이티브 TTL이 자동 evict하므로 false, DB 테이블은 조회에 안 걸리는
    /// 만료 행이 쌓이므로 true. 컴포지션 루트가 `!redis_url` 부정 조건 대신 이 의도를 읽는다.
    pub needs_expiry_sweep: bool,
}

/// 리프레시 토큰 저장소 백엔드를 고른다. 선택 조건을 컴포지션 루트에서 걷어내
/// 포트 어댑터 옆 한 곳에 모으고, 백엔드별 만료 청소 필요 여부까지 함께 확정해 돌려준다.
pub fn create_refresh_token_store(
    redis_url: Option<&str>,
    pool: Option<PgPool>,
    idle_ttl_ms: i64,
    absolute_ttl_ms: i64,
) -> Result<RefreshTokenStoreBundle, redis::RedisError> {
    if let Some(url) = redis_url {
        return Ok(RefreshTokenStoreBundle {
            store: Arc::new(RedisRefreshTokenStore::new(url, idle_ttl_ms, absolute_ttl_ms)?),
            backend: RefreshTokenBackend::Redis,
            needs_expiry_sweep: false,
        });
    }
    match pool {
        Some(pool) => Ok(RefreshTokenStoreBundle {
            store: Arc::new(SqlRefreshTokenStore::new(pool, idle_ttl_ms, absolute_ttl_ms)),
            backend: RefreshTokenBackend::Sql,
            needs_expiry_sweep: true,
        }),
        None => Ok(RefreshTokenStoreBundle {
            store: Arc::new(InMemoryRefreshTokenStore::new(idle_ttl_ms, absolute_ttl_ms)),
            backend: RefreshTokenBackend::Memory,
            needs_expiry_sweep: true,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redis_url이_있으면_redis_백엔드이고_스윕이_필요없다() {
        let bundle = create_refresh_token_store(Some("redis://127.0.0.1/"), None, 1, 2).expect("번들");
        assert_eq!(bundle.backend, RefreshTokenBackend::Redis);
        assert!(!bundle.needs_expiry_sweep, "Redis는 네이티브 TTL이 청소한다");
    }

    #[test]
    fn db도_redis도_없으면_인메모리이고_스윕이_필요하다() {
        let bundle = create_refresh_token_store(None, None, 1, 2).expect("번들");
        assert_eq!(bundle.backend, RefreshTokenBackend::Memory);
        assert!(bundle.needs_expiry_sweep);
    }
}
