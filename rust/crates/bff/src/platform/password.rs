//! 비밀번호 해시 — TS의 `Bun.password`(argon2id 기본) 대응.
//! 해시 알고리즘은 저장소 구현 세부라 웹↔BFF 계약에 드러나지 않는다.

use argon2::password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;

use crate::platform::errors::{StoreError, StoreResult};

pub fn hash_password(password: &str) -> StoreResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(StoreError::infrastructure)
}

pub fn verify_password(password: &str, hash: &str) -> StoreResult<bool> {
    let parsed = PasswordHash::new(hash).map_err(StoreError::infrastructure)?;
    Ok(Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 올바른_비밀번호만_통과한다() {
        let hash = hash_password("password123").expect("해시");
        assert!(verify_password("password123", &hash).expect("검증"));
        assert!(!verify_password("wrong-password", &hash).expect("검증"));
    }

    #[test]
    fn 같은_비밀번호도_해시는_매번_다르다() {
        assert_ne!(hash_password("password123").unwrap(), hash_password("password123").unwrap());
    }
}
