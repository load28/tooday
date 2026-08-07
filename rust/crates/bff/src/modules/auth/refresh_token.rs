use rand::RngCore;
use sha2::{Digest, Sha256};

/// 불투명 리프레시 토큰 — 32바이트 난수의 hex(64자).
pub fn generate_refresh_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

/// 저장용 해시 — 토큰 원문은 클라이언트만 가진다.
/// 저장소 유출이 세션 탈취로 이어지지 않게 한다.
pub fn hash_refresh_token(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 토큰은_64자_hex이고_매번_다르다() {
        let a = generate_refresh_token();
        let b = generate_refresh_token();
        assert_eq!(a.len(), 64);
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
        assert_ne!(a, b);
    }

    #[test]
    fn 해시는_결정적이고_원문과_다르다() {
        let token = generate_refresh_token();
        assert_eq!(hash_refresh_token(&token), hash_refresh_token(&token));
        assert_ne!(hash_refresh_token(&token), token);
        assert_eq!(hash_refresh_token(&token).len(), 64);
    }
}
