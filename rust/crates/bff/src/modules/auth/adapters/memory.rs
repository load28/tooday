use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use tooday_shared::User;

use crate::modules::auth::ports::{
    CreateUserInput, Credentials, RefreshToken, RefreshTokenStore, UserStore,
};
use crate::modules::auth::refresh_token::generate_refresh_token;
use crate::modules::user::ports::UserReader;
use crate::platform::errors::{domain, DomainErrorCode, StoreResult};
use crate::platform::ids::new_id;
use crate::platform::password::{hash_password, verify_password};

#[derive(Debug, Clone)]
struct UserRecord {
    user: User,
    password_hash: String,
}

#[derive(Default)]
pub struct InMemoryUserStore {
    state: Mutex<UserState>,
}

#[derive(Default)]
struct UserState {
    by_id: HashMap<String, UserRecord>,
    id_by_email: HashMap<String, String>,
}

impl InMemoryUserStore {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl UserStore for InMemoryUserStore {
    async fn create(&self, input: CreateUserInput) -> StoreResult<User> {
        let normalized_email = input.email.trim().to_lowercase();
        {
            let state = self.state.lock().expect("user store mutex");
            if state.id_by_email.contains_key(&normalized_email) {
                return domain(DomainErrorCode::EmailTaken);
            }
        }
        let record = UserRecord {
            user: User { id: new_id(), email: normalized_email.clone(), name: input.name },
            password_hash: hash_password(&input.password)?,
        };
        let mut state = self.state.lock().expect("user store mutex");
        // 잠금을 놓았던 사이에 같은 이메일이 먼저 들어왔을 수 있다 — 유니크 제약을 여기서 지킨다
        if state.id_by_email.contains_key(&normalized_email) {
            return domain(DomainErrorCode::EmailTaken);
        }
        state.id_by_email.insert(normalized_email, record.user.id.clone());
        state.by_id.insert(record.user.id.clone(), record.clone());
        Ok(record.user)
    }

    async fn verify_credentials(&self, input: Credentials) -> StoreResult<Option<User>> {
        let record = {
            let state = self.state.lock().expect("user store mutex");
            state
                .id_by_email
                .get(&input.email.trim().to_lowercase())
                .and_then(|id| state.by_id.get(id))
                .cloned()
        };
        let Some(record) = record else { return Ok(None) };
        Ok(verify_password(&input.password, &record.password_hash)?.then_some(record.user))
    }
}

/// UserStore 포트 밖 계약 — 인메모리 세계의 users 테이블 읽기.
/// 테스트 조립 루트가 이 인스턴스를 user 모듈의 `UserReader`로도 물린다
/// (SQL 세계에서 두 모듈의 어댑터가 같은 테이블을 보는 것과 동형).
#[async_trait]
impl UserReader for InMemoryUserStore {
    async fn find_by_id(&self, id: &str) -> StoreResult<Option<User>> {
        let state = self.state.lock().expect("user store mutex");
        Ok(state.by_id.get(id).map(|record| record.user.clone()))
    }
}

#[derive(Debug, Clone)]
struct TokenRecord {
    token: RefreshToken,
    superseded_at: Option<i64>,
}

pub struct InMemoryRefreshTokenStore {
    tokens: Mutex<HashMap<String, TokenRecord>>,
    idle_ttl_ms: i64,
    absolute_ttl_ms: i64,
}

impl InMemoryRefreshTokenStore {
    pub fn new(idle_ttl_ms: i64, absolute_ttl_ms: i64) -> Self {
        Self { tokens: Mutex::new(HashMap::new()), idle_ttl_ms, absolute_ttl_ms }
    }

    fn revoke_session(tokens: &mut HashMap<String, TokenRecord>, session_id: &str) {
        tokens.retain(|_, record| record.token.session_id != session_id);
    }
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

#[async_trait]
impl RefreshTokenStore for InMemoryRefreshTokenStore {
    async fn issue(&self, user_id: &str) -> StoreResult<RefreshToken> {
        let now = now_ms();
        let token = RefreshToken {
            token: generate_refresh_token(),
            user_id: user_id.to_owned(),
            session_id: new_id(),
            expires_at: now + self.idle_ttl_ms,
            absolute_expires_at: now + self.absolute_ttl_ms,
        };
        self.tokens
            .lock()
            .expect("refresh token mutex")
            .insert(token.token.clone(), TokenRecord { token: token.clone(), superseded_at: None });
        Ok(token)
    }

    async fn rotate(&self, token: &str) -> StoreResult<Option<RefreshToken>> {
        let now = now_ms();
        let mut tokens = self.tokens.lock().expect("refresh token mutex");
        let Some(current) = tokens.get(token).cloned() else { return Ok(None) };

        // 이미 회전된(supersede된) 토큰의 재제시 = 탈취 신호 → 세션 전체 무효화.
        if current.superseded_at.is_some() {
            Self::revoke_session(&mut tokens, &current.token.session_id);
            return Ok(None);
        }
        if current.token.expires_at <= now || current.token.absolute_expires_at <= now {
            tokens.remove(token);
            return Ok(None);
        }

        // 옛 토큰은 supersede 마킹만(재사용 탐지용, 만료 시 스윕이 청소), 새 토큰은 같은 세션으로.
        if let Some(record) = tokens.get_mut(token) {
            record.superseded_at = Some(now);
        }
        let next = RefreshToken {
            token: generate_refresh_token(),
            user_id: current.token.user_id.clone(),
            session_id: current.token.session_id.clone(),
            expires_at: (now + self.idle_ttl_ms).min(current.token.absolute_expires_at),
            absolute_expires_at: current.token.absolute_expires_at,
        };
        tokens.insert(next.token.clone(), TokenRecord { token: next.clone(), superseded_at: None });
        Ok(Some(next))
    }

    async fn revoke(&self, token: &str) -> StoreResult<()> {
        let mut tokens = self.tokens.lock().expect("refresh token mutex");
        if let Some(record) = tokens.get(token).cloned() {
            Self::revoke_session(&mut tokens, &record.token.session_id);
        }
        Ok(())
    }

    async fn is_session_live(&self, session_id: &str) -> StoreResult<bool> {
        let now = now_ms();
        let tokens = self.tokens.lock().expect("refresh token mutex");
        Ok(tokens
            .values()
            .any(|record| record.token.session_id == session_id && record.token.absolute_expires_at > now))
    }

    async fn delete_expired(&self) -> StoreResult<u64> {
        let now = now_ms();
        let mut tokens = self.tokens.lock().expect("refresh token mutex");
        let before = tokens.len();
        tokens.retain(|_, record| record.token.expires_at > now && record.token.absolute_expires_at > now);
        Ok((before - tokens.len()) as u64)
    }
}
