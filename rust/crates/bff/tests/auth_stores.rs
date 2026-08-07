//! `apps/bff/src/modules/auth/adapters/adapters.test.ts`의 포팅본 — 스토어 포트 계약.
//!
//! TS는 memory와 sql(pglite) 두 구현에 같은 계약을 돌렸다. 러스트에는 임베디드
//! Postgres 대응물이 없으므로 sql은 실제 서버가 있을 때만 돈다
//! (`TOODAY_TEST_DATABASE_URL`) — 없으면 memory만 검증하고 sql은 조용히 건너뛴다.

use std::sync::Arc;

use tooday_bff::modules::auth::adapters::memory::{InMemoryRefreshTokenStore, InMemoryUserStore};
use tooday_bff::modules::auth::adapters::sql::{SqlRefreshTokenStore, SqlUserStore};
use tooday_bff::modules::auth::ports::{CreateUserInput, Credentials, RefreshTokenStore, UserStore};
use tooday_bff::platform::db::testing::{test_database, test_database_url};
use tooday_bff::platform::errors::{DomainErrorCode, StoreError};

struct Stores {
    users: Arc<dyn UserStore>,
    refresh_tokens: Arc<dyn RefreshTokenStore>,
}

const IDLE_LONG: i64 = 60_000;
const ABSOLUTE_LONG: i64 = 120_000;

fn input() -> CreateUserInput {
    CreateUserInput {
        email: "store@tooday.app".into(),
        password: "password123".into(),
        name: "스토어".into(),
    }
}

async fn memory_stores(idle_ttl_ms: i64, absolute_ttl_ms: i64) -> Stores {
    Stores {
        users: Arc::new(InMemoryUserStore::new()),
        refresh_tokens: Arc::new(InMemoryRefreshTokenStore::new(idle_ttl_ms, absolute_ttl_ms)),
    }
}

async fn sql_stores(idle_ttl_ms: i64, absolute_ttl_ms: i64) -> Option<Stores> {
    test_database_url()?;
    let pool = test_database().await;
    Some(Stores {
        users: Arc::new(SqlUserStore::new(pool.clone())),
        refresh_tokens: Arc::new(SqlRefreshTokenStore::new(pool, idle_ttl_ms, absolute_ttl_ms)),
    })
}

/// 두 구현 모두에 같은 계약 본문을 돌린다 — TS의 `for (const impl of IMPLEMENTATIONS)`
async fn for_each_implementation<F, Fut>(idle_ttl_ms: i64, absolute_ttl_ms: i64, body: F)
where
    F: Fn(Stores, &'static str) -> Fut,
    Fut: std::future::Future<Output = ()>,
{
    body(memory_stores(idle_ttl_ms, absolute_ttl_ms).await, "memory").await;
    if let Some(stores) = sql_stores(idle_ttl_ms, absolute_ttl_ms).await {
        body(stores, "sql(postgres)").await;
    }
}

fn assert_email_taken(error: StoreError, implementation: &str) {
    let domain = error.find_domain().unwrap_or_else(|| panic!("{implementation}: 도메인 에러여야 한다"));
    assert_eq!(domain.code, DomainErrorCode::EmailTaken, "{implementation}");
}

#[tokio::test]
async fn 유저를_생성한다_이메일은_정규화() {
    for_each_implementation(IDLE_LONG, ABSOLUTE_LONG, |stores, name| async move {
        let created = stores
            .users
            .create(CreateUserInput { email: " Store@Tooday.App ".into(), ..input() })
            .await
            .expect("생성");
        assert_eq!(created.email, "store@tooday.app", "{name}");
    })
    .await;
}

#[tokio::test]
async fn 중복_이메일이면_email_taken을_던진다() {
    for_each_implementation(IDLE_LONG, ABSOLUTE_LONG, |stores, name| async move {
        stores.users.create(input()).await.expect("첫 생성");
        let error = stores.users.create(input()).await.expect_err("두 번째는 실패");
        assert_email_taken(error, name);
    })
    .await;
}

#[tokio::test]
async fn 자격_증명을_검증한다() {
    for_each_implementation(IDLE_LONG, ABSOLUTE_LONG, |stores, name| async move {
        let created = stores.users.create(input()).await.expect("생성");

        let ok = stores
            .users
            .verify_credentials(Credentials {
                email: input().email,
                password: input().password,
            })
            .await
            .expect("검증");
        assert_eq!(ok.as_ref(), Some(&created), "{name}");

        let wrong_password = stores
            .users
            .verify_credentials(Credentials {
                email: input().email,
                password: "wrong-password".into(),
            })
            .await
            .expect("검증");
        assert_eq!(wrong_password, None, "{name}");

        let unknown_email = stores
            .users
            .verify_credentials(Credentials {
                email: "nobody@tooday.app".into(),
                password: input().password,
            })
            .await
            .expect("검증");
        assert_eq!(unknown_email, None, "{name}");
    })
    .await;
}

#[tokio::test]
async fn 리프레시를_발급하고_회전은_새_토큰을_주며_옛_토큰을_폐기한다() {
    for_each_implementation(IDLE_LONG, ABSOLUTE_LONG, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");

        let issued = stores.refresh_tokens.issue(&user.id).await.expect("발급");
        assert_eq!(issued.user_id, user.id, "{name}");

        let rotated = stores.refresh_tokens.rotate(&issued.token).await.expect("회전").expect("회전 성공");
        assert_eq!(rotated.user_id, user.id, "{name}");
        assert_ne!(rotated.token, issued.token, "{name}");

        // 옛 토큰은 회전으로 폐기 → 재사용 불가
        assert_eq!(stores.refresh_tokens.rotate(&issued.token).await.expect("회전"), None, "{name}");
    })
    .await;
}

#[tokio::test]
async fn 회전은_같은_세션을_유지한다() {
    for_each_implementation(IDLE_LONG, ABSOLUTE_LONG, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");
        let issued = stores.refresh_tokens.issue(&user.id).await.expect("발급");
        let rotated = stores.refresh_tokens.rotate(&issued.token).await.expect("회전").expect("회전 성공");
        assert_eq!(rotated.session_id, issued.session_id, "{name}");
    })
    .await;
}

#[tokio::test]
async fn 회전된_옛_토큰을_재사용하면_세션_전체가_무효화된다() {
    for_each_implementation(IDLE_LONG, ABSOLUTE_LONG, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");
        let first = stores.refresh_tokens.issue(&user.id).await.expect("발급");
        // first supersede, second 활성
        let second =
            stores.refresh_tokens.rotate(&first.token).await.expect("회전").expect("회전 성공");

        // 옛 토큰 재제시 = 탈취 신호 → 세션 전체 무효화
        assert_eq!(stores.refresh_tokens.rotate(&first.token).await.expect("회전"), None, "{name}");
        // 활성이던 두 번째 토큰도 함께 죽는다
        assert_eq!(stores.refresh_tokens.rotate(&second.token).await.expect("회전"), None, "{name}");
    })
    .await;
}

#[tokio::test]
async fn revoke는_토큰이_속한_세션_전체를_무효화한다() {
    for_each_implementation(IDLE_LONG, ABSOLUTE_LONG, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");
        let first = stores.refresh_tokens.issue(&user.id).await.expect("발급");
        let second =
            stores.refresh_tokens.rotate(&first.token).await.expect("회전").expect("회전 성공");

        // 현재 토큰으로 로그아웃하면 옛·현재 토큰 모두 폐기된다
        stores.refresh_tokens.revoke(&second.token).await.expect("폐기");
        assert_eq!(stores.refresh_tokens.rotate(&second.token).await.expect("회전"), None, "{name}");
    })
    .await;
}

#[tokio::test]
async fn is_session_live_발급_시_live_폐기하면_dead() {
    for_each_implementation(IDLE_LONG, ABSOLUTE_LONG, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");
        let issued = stores.refresh_tokens.issue(&user.id).await.expect("발급");

        assert!(stores.refresh_tokens.is_session_live(&issued.session_id).await.expect("조회"), "{name}");
        let unknown = uuid::Uuid::now_v7().to_string();
        assert!(!stores.refresh_tokens.is_session_live(&unknown).await.expect("조회"), "{name}");

        stores.refresh_tokens.revoke(&issued.token).await.expect("폐기");
        assert!(!stores.refresh_tokens.is_session_live(&issued.session_id).await.expect("조회"), "{name}");
    })
    .await;
}

#[tokio::test]
async fn is_session_live_회전해도_같은_세션이_계속_live() {
    for_each_implementation(IDLE_LONG, ABSOLUTE_LONG, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");
        let issued = stores.refresh_tokens.issue(&user.id).await.expect("발급");
        let rotated = stores.refresh_tokens.rotate(&issued.token).await.expect("회전").expect("회전 성공");

        assert!(stores.refresh_tokens.is_session_live(&rotated.session_id).await.expect("조회"), "{name}");
    })
    .await;
}

#[tokio::test]
async fn is_session_live_absolute_만료_세션은_dead() {
    for_each_implementation(60_000, -1, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");
        let issued = stores.refresh_tokens.issue(&user.id).await.expect("발급");
        assert!(!stores.refresh_tokens.is_session_live(&issued.session_id).await.expect("조회"), "{name}");
    })
    .await;
}

#[tokio::test]
async fn 회전은_idle을_슬라이딩하되_absolute_하드캡을_넘지_않는다() {
    for_each_implementation(60_000, 30_000, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");
        let issued = stores.refresh_tokens.issue(&user.id).await.expect("발급");

        let rotated = stores.refresh_tokens.rotate(&issued.token).await.expect("회전").expect("회전 성공");
        // idle(60s)이 아니라 absolute 상한(≈issue+30s)에 캡된다
        assert_eq!(rotated.expires_at, issued.absolute_expires_at, "{name}");
        assert_eq!(rotated.absolute_expires_at, issued.absolute_expires_at, "{name}");
    })
    .await;
}

#[tokio::test]
async fn idle_만료_토큰은_회전되지_않고_delete_expired가_청소한다() {
    for_each_implementation(-1, 120_000, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");

        stores.refresh_tokens.issue(&user.id).await.expect("발급");
        let expired = stores.refresh_tokens.issue(&user.id).await.expect("발급");
        // 회전이 만료 행 하나를 지운다
        assert_eq!(stores.refresh_tokens.rotate(&expired.token).await.expect("회전"), None, "{name}");

        assert_eq!(stores.refresh_tokens.delete_expired().await.expect("청소"), 1, "{name}");
        assert_eq!(stores.refresh_tokens.delete_expired().await.expect("청소"), 0, "{name}");
    })
    .await;
}

#[tokio::test]
async fn absolute_만료_토큰은_회전되지_않는다() {
    for_each_implementation(60_000, -1, |stores, name| async move {
        let user = stores.users.create(input()).await.expect("생성");
        let issued = stores.refresh_tokens.issue(&user.id).await.expect("발급");

        assert_eq!(stores.refresh_tokens.rotate(&issued.token).await.expect("회전"), None, "{name}");
    })
    .await;
}
