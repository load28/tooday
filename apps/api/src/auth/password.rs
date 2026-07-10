//! 비밀번호 해싱 — argon2id(PHC 문자열).
//!
//! BFF 시절 Bun.password.hash(기본 argon2id)가 만든 해시도 PHC 문자열에 파라미터가
//! 담겨 있으므로 그대로 검증된다 — 기존 계정 재로그인 호환.

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;

pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    Ok(Argon2::default().hash_password(password.as_bytes(), &salt)?.to_string())
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_and_verify_roundtrip() {
        let hash = hash_password("password123").unwrap();
        assert!(hash.starts_with("$argon2id$"));
        assert!(verify_password("password123", &hash));
        assert!(!verify_password("wrong-password", &hash));
        assert!(!verify_password("password123", "not-a-phc-hash"));
    }

    /// Bun.password.hash('password123') 출력 고정 — 기존 유저 해시 검증 호환
    #[test]
    fn verifies_bun_generated_hash() {
        let bun_hash = "$argon2id$v=19$m=65536,t=2,p=1$DyZOFdCEKfxMxjdDKtmYz3Oa1hvz/V78pktiRcS9Qu0$ZdfRIaJGoi5XuySSzpMNQemswqNq3NjISX+ujBI5p2c";
        assert!(verify_password("password123", bun_hash));
        assert!(!verify_password("password124", bun_hash));
    }
}
