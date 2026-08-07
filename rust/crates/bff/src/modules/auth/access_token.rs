use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccessTokenClaims {
    pub user_id: String,
    /// 세션 식별자(OIDC `sid` 클레임) — 매 요청 세션 라이브니스 체크의 키
    pub session_id: String,
}

/// JWT 페이로드의 실제 모양 — TS(hono/jwt)가 서명하던 클레임과 같다.
#[derive(Debug, Serialize, Deserialize)]
struct Payload {
    sub: String,
    sid: String,
    exp: i64,
}

/// 액세스 토큰(무상태 JWT) 발급·검증. 서명·만료 검증만으로 신원(userId)과 세션(sid)을
/// 얻는다 — 저장소를 타지 않는다. 즉시 무효화는 이 검증 뒤 세션 라이브니스 체크로 얹는다
/// (JWT 자체는 만료 전까지 유효하므로).
pub trait AccessTokens: Send + Sync {
    fn sign(&self, claims: &AccessTokenClaims) -> String;
    /// 서명·만료가 유효하면 클레임(userId+sid), 아니면 None
    fn verify(&self, token: &str) -> Option<AccessTokenClaims>;
}

pub struct AccessTokenService {
    encoding: EncodingKey,
    decoding: DecodingKey,
    ttl_ms: i64,
}

impl AccessTokenService {
    pub fn new(secret: &str, ttl_ms: i64) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret.as_bytes()),
            decoding: DecodingKey::from_secret(secret.as_bytes()),
            ttl_ms,
        }
    }
}

impl AccessTokens for AccessTokenService {
    fn sign(&self, claims: &AccessTokenClaims) -> String {
        // TS와 같은 계산 — 밀리초 만료를 초로 내림한다
        let exp = (chrono::Utc::now().timestamp_millis() + self.ttl_ms).div_euclid(1000);
        let payload = Payload { sub: claims.user_id.clone(), sid: claims.session_id.clone(), exp };
        encode(&Header::new(Algorithm::HS256), &payload, &self.encoding)
            .expect("HS256 서명은 실패하지 않는다")
    }

    fn verify(&self, token: &str) -> Option<AccessTokenClaims> {
        let mut validation = Validation::new(Algorithm::HS256);
        // 서명·alg·exp만 본다 (TS hono/jwt와 같은 범위) — aud/iss는 계약에 없다
        validation.required_spec_claims.clear();
        validation.validate_aud = false;
        // 만료는 정확히 exp 시점부터 무효 — TS와 같게 유예 없음
        validation.leeway = 0;
        decode::<Payload>(token, &self.decoding, &validation)
            .ok()
            .map(|data| AccessTokenClaims { user_id: data.claims.sub, session_id: data.claims.sid })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn claims() -> AccessTokenClaims {
        AccessTokenClaims { user_id: "user-1".into(), session_id: "session-1".into() }
    }

    #[test]
    fn 서명한_토큰을_검증하면_클레임이_돌아온다() {
        let service = AccessTokenService::new("test-secret", 60_000);
        let token = service.sign(&claims());
        assert_eq!(token.split('.').count(), 3, "액세스는 JWT");
        assert_eq!(service.verify(&token), Some(claims()));
    }

    #[test]
    fn 다른_시크릿으로_서명된_토큰은_거부한다() {
        let issuer = AccessTokenService::new("test-secret", 60_000);
        let verifier = AccessTokenService::new("other-secret", 60_000);
        assert_eq!(verifier.verify(&issuer.sign(&claims())), None);
    }

    #[test]
    fn 만료된_토큰은_거부한다() {
        let service = AccessTokenService::new("test-secret", -60_000);
        assert_eq!(service.verify(&service.sign(&claims())), None);
    }

    #[test]
    fn 변조된_토큰은_거부한다() {
        let service = AccessTokenService::new("test-secret", 60_000);
        let token = service.sign(&claims());
        assert_eq!(service.verify(&format!("{token}tampered")), None);
        assert_eq!(service.verify("not-a-jwt"), None);
    }
}
