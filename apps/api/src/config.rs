const MINUTE_MS: u64 = 60 * 1000;
const DAY_MS: u64 = 24 * 60 * 60 * 1000;
const DEV_JWT_SECRET: &str = "tooday-dev-insecure-jwt-secret-change-me";
/// docker-compose.yml 기본 접속 문자열 — 개발에서 env 없이 `bun run infra:up`만으로 붙는다.
const DEV_DATABASE_URL: &str = "postgres://tooday:tooday@localhost:5432/tooday";

pub struct ApiConfig {
    pub port: u16,
    pub database_url: String,
    pub pg_pool_size: u32,
    /// 설정 시 리프레시 토큰 저장소로 Redis를 쓴다(미설정이면 DB 테이블).
    pub redis_url: Option<String>,
    /// 액세스 JWT 서명 시크릿(HS256). 프로덕션에서는 필수.
    pub jwt_secret: String,
    pub access_ttl_ms: u64,
    pub refresh_idle_ttl_ms: u64,
    pub refresh_absolute_ttl_ms: u64,
    /// BFF ↔ API 내부 인증 토큰. 프로덕션에서는 필수.
    pub internal_token: Option<String>,
}

fn env_var(name: &str) -> Option<String> {
    std::env::var(name).ok().filter(|value| !value.is_empty())
}

fn env_number<T: std::str::FromStr>(name: &str, default: T) -> Result<T, String> {
    match env_var(name) {
        Some(raw) => raw.parse().map_err(|_| format!("{name} 값이 숫자가 아닙니다: {raw}")),
        None => Ok(default),
    }
}

impl ApiConfig {
    pub fn from_env() -> Result<Self, String> {
        let is_production = env_var("NODE_ENV").as_deref() == Some("production");
        let jwt_secret = env_var("API_JWT_SECRET");
        if is_production && jwt_secret.is_none() {
            return Err("API_JWT_SECRET는 프로덕션에서 필수다 (액세스 토큰 서명 키).".into());
        }
        let internal_token = env_var("INTERNAL_API_TOKEN");
        if is_production && internal_token.is_none() {
            return Err("INTERNAL_API_TOKEN는 프로덕션에서 필수다 (BFF ↔ API 내부 인증).".into());
        }
        let database_url = match env_var("DATABASE_URL") {
            Some(url) => url,
            None if is_production => return Err("DATABASE_URL는 프로덕션에서 필수다.".into()),
            None => DEV_DATABASE_URL.into(),
        };
        Ok(Self {
            port: env_number("API_PORT", 3003)?,
            database_url,
            pg_pool_size: env_number("API_PG_POOL_SIZE", 10)?,
            redis_url: env_var("REDIS_URL"),
            jwt_secret: jwt_secret.unwrap_or_else(|| DEV_JWT_SECRET.into()),
            access_ttl_ms: env_number("API_ACCESS_TTL_MS", 15 * MINUTE_MS)?,
            refresh_idle_ttl_ms: env_number("API_REFRESH_IDLE_TTL_MS", 14 * DAY_MS)?,
            refresh_absolute_ttl_ms: env_number("API_REFRESH_ABSOLUTE_TTL_MS", 90 * DAY_MS)?,
            internal_token,
        })
    }
}
