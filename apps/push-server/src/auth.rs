use jsonwebtoken::{Algorithm, DecodingKey, Validation};
use serde::Deserialize;

#[derive(Deserialize)]
struct AccessClaims {
    /// 유저 id — BFF access-token.ts의 `sub` 클레임과 같은 계약.
    sub: String,
}

/// BFF가 발급한 액세스 JWT(HS256, sub=userId)를 시크릿 공유로 검증한다.
///
/// BFF는 검증 뒤 세션 라이브니스 체크까지 하지만 여기서는 서명·만료만 본다 —
/// 구독 등록/해제는 저위험이고 액세스 TTL이 짧아(기본 15분) 폐기 지연이 그 안에
/// 갇힌다. 검증 실패는 사유 구분 없이 None (인증 오류는 401 하나로 충분).
pub fn verify_access_token(token: &str, secret: &str) -> Option<String> {
    // Validation 기본값이 exp 필수·만료 검증 — BFF 토큰은 항상 exp를 싣는다.
    let validation = Validation::new(Algorithm::HS256);
    let key = DecodingKey::from_secret(secret.as_bytes());
    jsonwebtoken::decode::<AccessClaims>(token, &key, &validation)
        .ok()
        .map(|data| data.claims.sub)
}

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::{encode, EncodingKey, Header};
    use serde_json::json;

    const SECRET: &str = "test-secret";

    fn sign(claims: serde_json::Value, secret: &str) -> String {
        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .expect("서명")
    }

    fn exp_in(secs: i64) -> i64 {
        chrono::Utc::now().timestamp() + secs
    }

    #[test]
    fn 유효한_토큰이면_sub를_돌려준다() {
        let token = sign(
            json!({ "sub": "user-1", "sid": "sess-1", "exp": exp_in(60) }),
            SECRET,
        );
        assert_eq!(
            verify_access_token(&token, SECRET),
            Some("user-1".to_string())
        );
    }

    #[test]
    fn 만료된_토큰은_거부한다() {
        let token = sign(json!({ "sub": "user-1", "exp": exp_in(-3600) }), SECRET);
        assert_eq!(verify_access_token(&token, SECRET), None);
    }

    #[test]
    fn 다른_시크릿으로_서명한_토큰은_거부한다() {
        let token = sign(
            json!({ "sub": "user-1", "exp": exp_in(60) }),
            "wrong-secret",
        );
        assert_eq!(verify_access_token(&token, SECRET), None);
    }

    #[test]
    fn sub_없는_토큰은_거부한다() {
        let token = sign(json!({ "sid": "sess-1", "exp": exp_in(60) }), SECRET);
        assert_eq!(verify_access_token(&token, SECRET), None);
    }
}
