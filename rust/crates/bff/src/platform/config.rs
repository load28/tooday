use std::collections::HashMap;

use crate::platform::logging::LogFormat;

#[derive(Debug, Clone)]
pub struct BffConfig {
    pub port: u16,
    pub allowed_origins: Vec<String>,
    pub access_cookie_name: String,
    pub refresh_cookie_name: String,
    pub cookie_secure: bool,
    /// 액세스 JWT 서명 시크릿(HS256). 프로덕션에서는 필수.
    pub jwt_secret: String,
    /// 액세스 토큰 수명 — 짧다. 만료 시 리프레시로 재발급.
    pub access_ttl_ms: i64,
    /// 리프레시 idle 수명(슬라이딩) — 회전할 때마다 이만큼 다시 연장된다.
    pub refresh_idle_ttl_ms: i64,
    /// 리프레시 절대 수명(하드캡) — 로그인 시 박히고 회전해도 안 늘어난다.
    pub refresh_absolute_ttl_ms: i64,
    /// PostgreSQL 연결 문자열. 미설정이면 인메모리 어댑터(개발·테스트)로 동작한다.
    pub database_url: Option<String>,
    pub pg_pool_size: u32,
    /// Redis 연결 문자열. 설정 시 리프레시 토큰 저장소로 Redis를 쓴다(미설정이면 DB 테이블).
    pub redis_url: Option<String>,
    pub log_format: LogFormat,
    /// 요청 로거를 붙일지 — 테스트에서는 로그 소음을 없애려 끈다.
    pub log_requests: bool,
}

const MINUTE_MS: i64 = 60 * 1000;
const DAY_MS: i64 = 24 * 60 * 60 * 1000;
const DEV_JWT_SECRET: &str = "tooday-dev-insecure-jwt-secret-change-me";

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("BFF_JWT_SECRET는 프로덕션에서 필수다 (액세스 토큰 서명 키).")]
    MissingJwtSecret,
}

pub fn load_config() -> Result<BffConfig, ConfigError> {
    load_config_from(&std::env::vars().collect())
}

pub fn load_config_from(env: &HashMap<String, String>) -> Result<BffConfig, ConfigError> {
    let get = |key: &str| env.get(key).map(String::as_str).filter(|value| !value.is_empty());
    let is_production = get("NODE_ENV") == Some("production");
    let jwt_secret = get("BFF_JWT_SECRET").unwrap_or_default();
    if is_production && jwt_secret.is_empty() {
        return Err(ConfigError::MissingJwtSecret);
    }

    let number = |key: &str, fallback: i64| -> i64 { get(key).and_then(|raw| raw.parse().ok()).unwrap_or(fallback) };

    Ok(BffConfig {
        port: number("BFF_PORT", 3002) as u16,
        allowed_origins: get("BFF_ALLOWED_ORIGINS")
            .unwrap_or("http://localhost:3000")
            .split(',')
            .map(str::trim)
            .filter(|origin| !origin.is_empty())
            .map(str::to_owned)
            .collect(),
        access_cookie_name: get("BFF_ACCESS_COOKIE").unwrap_or("tooday_access").to_owned(),
        refresh_cookie_name: get("BFF_REFRESH_COOKIE").unwrap_or("tooday_refresh").to_owned(),
        cookie_secure: is_production,
        jwt_secret: if jwt_secret.is_empty() { DEV_JWT_SECRET.to_owned() } else { jwt_secret.to_owned() },
        access_ttl_ms: number("BFF_ACCESS_TTL_MS", 15 * MINUTE_MS),
        refresh_idle_ttl_ms: number("BFF_REFRESH_IDLE_TTL_MS", 14 * DAY_MS),
        refresh_absolute_ttl_ms: number("BFF_REFRESH_ABSOLUTE_TTL_MS", 90 * DAY_MS),
        database_url: get("DATABASE_URL").map(str::to_owned),
        pg_pool_size: number("BFF_PG_POOL_SIZE", 10) as u32,
        redis_url: get("REDIS_URL").map(str::to_owned),
        log_format: match get("BFF_LOG_FORMAT") {
            Some("json") => LogFormat::Json,
            Some("pretty") => LogFormat::Pretty,
            _ if is_production => LogFormat::Json,
            _ => LogFormat::Pretty,
        },
        log_requests: get("NODE_ENV") != Some("test"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn env(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs.iter().map(|(k, v)| ((*k).to_owned(), (*v).to_owned())).collect()
    }

    #[test]
    fn 기본값은_개발_설정이다() {
        let config = load_config_from(&env(&[])).expect("개발 환경은 시크릿 없이도 뜬다");
        assert_eq!(config.port, 3002);
        assert_eq!(config.allowed_origins, vec!["http://localhost:3000".to_owned()]);
        assert_eq!(config.access_cookie_name, "tooday_access");
        assert!(!config.cookie_secure);
        assert_eq!(config.jwt_secret, DEV_JWT_SECRET);
        assert_eq!(config.access_ttl_ms, 15 * MINUTE_MS);
        assert_eq!(config.log_format, LogFormat::Pretty);
        assert!(config.database_url.is_none());
        assert!(config.redis_url.is_none());
    }

    #[test]
    fn 프로덕션은_jwt_시크릿이_없으면_기동에_실패한다() {
        let result = load_config_from(&env(&[("NODE_ENV", "production")]));
        assert!(matches!(result, Err(ConfigError::MissingJwtSecret)));
    }

    #[test]
    fn 프로덕션은_쿠키_secure와_json_로그가_기본이다() {
        let config = load_config_from(&env(&[("NODE_ENV", "production"), ("BFF_JWT_SECRET", "s3cret")]))
            .expect("시크릿이 있으면 뜬다");
        assert!(config.cookie_secure);
        assert_eq!(config.log_format, LogFormat::Json);
    }

    #[test]
    fn 오리진은_쉼표로_나뉘고_공백이_정리된다() {
        let config = load_config_from(&env(&[("BFF_ALLOWED_ORIGINS", "http://a.test, http://b.test ,")]))
            .expect("설정 로드");
        assert_eq!(config.allowed_origins, vec!["http://a.test".to_owned(), "http://b.test".to_owned()]);
    }

    #[test]
    fn 테스트_환경은_요청_로거를_끈다() {
        assert!(!load_config_from(&env(&[("NODE_ENV", "test")])).expect("설정 로드").log_requests);
        assert!(load_config_from(&env(&[])).expect("설정 로드").log_requests);
    }
}
