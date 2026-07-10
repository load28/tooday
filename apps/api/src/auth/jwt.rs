//! 액세스 토큰(무상태 JWT, HS256) 발급·검증.
//!
//! BFF 시절(hono/jwt)과 동일한 클레임(`sub`=userId, `sid`=세션, `exp`)을 쓴다 —
//! 서명·만료 검증만으로 신원과 세션을 얻고, 즉시 무효화는 세션 라이브니스 체크로 얹는다.

use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    /// 세션 식별자(OIDC `sid` 클레임) — 매 요청 세션 라이브니스 체크의 키
    sid: String,
    exp: u64,
}

pub struct AccessTokenClaims {
    pub user_id: String,
    pub session_id: String,
}

pub struct AccessTokens {
    encoding: EncodingKey,
    decoding: DecodingKey,
    ttl_ms: u64,
}

impl AccessTokens {
    pub fn new(secret: &str, ttl_ms: u64) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret.as_bytes()),
            decoding: DecodingKey::from_secret(secret.as_bytes()),
            ttl_ms,
        }
    }

    pub fn sign(&self, user_id: &str, session_id: &str) -> Result<String, jsonwebtoken::errors::Error> {
        let exp = (now_ms() + self.ttl_ms) / 1000;
        let claims = Claims { sub: user_id.into(), sid: session_id.into(), exp };
        encode(&Header::new(Algorithm::HS256), &claims, &self.encoding)
    }

    /// 서명·만료가 유효하면 클레임(userId+sid), 아니면 None
    pub fn verify(&self, token: &str) -> Option<AccessTokenClaims> {
        let mut validation = Validation::new(Algorithm::HS256);
        validation.leeway = 0; // hono/jwt와 동일 — 만료에 유예 없음
        let data = decode::<Claims>(token, &self.decoding, &validation).ok()?;
        Some(AccessTokenClaims { user_id: data.claims.sub, session_id: data.claims.sid })
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("시스템 시계가 epoch 이전")
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sign_and_verify_roundtrip() {
        let tokens = AccessTokens::new("test-secret", 60_000);
        let token = tokens.sign("user-1", "session-1").unwrap();
        assert_eq!(token.split('.').count(), 3);
        let claims = tokens.verify(&token).unwrap();
        assert_eq!(claims.user_id, "user-1");
        assert_eq!(claims.session_id, "session-1");
    }

    #[test]
    fn rejects_wrong_secret_and_expired() {
        let tokens = AccessTokens::new("test-secret", 60_000);
        let other = AccessTokens::new("other-secret", 60_000);
        let token = tokens.sign("user-1", "session-1").unwrap();
        assert!(other.verify(&token).is_none());

        let expired = AccessTokens::new("test-secret", 0);
        let token = expired.sign("user-1", "session-1").unwrap();
        std::thread::sleep(std::time::Duration::from_millis(1100));
        assert!(expired.verify(&token).is_none());
    }

    /// hono/jwt(BFF 시절)가 서명한 토큰도 검증된다 — 마이그레이션 시 발급된 토큰 호환
    #[test]
    fn verifies_hono_jwt_token() {
        // hono/jwt sign({sub:'u1', sid:'s1', exp: 32503680000}, 'test-secret', 'HS256') 출력 고정
        let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsInNpZCI6InMxIiwiZXhwIjozMjUwMzY4MDAwMH0.jFJoLgvU_2ORlC8QvV_OT9Lpfm4kC-DrIxUYMx4ngAU";
        let tokens = AccessTokens::new("test-secret", 60_000);
        let claims = tokens.verify(token).unwrap();
        assert_eq!(claims.user_id, "u1");
        assert_eq!(claims.session_id, "s1");
    }
}
