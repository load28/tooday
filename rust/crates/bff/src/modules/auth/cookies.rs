use crate::platform::config::BffConfig;

const BASE_ATTRIBUTES: &str = "HttpOnly; SameSite=Lax; Path=/";

fn serialize_auth_cookie(name: &str, value: &str, config: &BffConfig, max_age_ms: i64) -> String {
    let max_age = max_age_ms.div_euclid(1000);
    let secure = if config.cookie_secure { "; Secure" } else { "" };
    format!("{name}={value}; Max-Age={max_age}; {BASE_ATTRIBUTES}{secure}")
}

/// 액세스 쿠키 — 짧다(액세스 TTL). 매 요청 인증에 쓰인다.
pub fn serialize_access_cookie(config: &BffConfig, token: &str) -> String {
    serialize_auth_cookie(&config.access_cookie_name, token, config, config.access_ttl_ms)
}

/// 리프레시 쿠키 — 길다(absolute 하드캡까지). idle 만료는 서버가 판단한다.
pub fn serialize_refresh_cookie(config: &BffConfig, token: &str) -> String {
    serialize_auth_cookie(&config.refresh_cookie_name, token, config, config.refresh_absolute_ttl_ms)
}

fn serialize_removal(name: &str) -> String {
    format!("{name}=; Max-Age=0; Path=/")
}

/// 로그아웃 — 액세스·리프레시 쿠키를 함께 지운다.
pub fn serialize_auth_cookie_removals(config: &BffConfig) -> Vec<String> {
    vec![serialize_removal(&config.access_cookie_name), serialize_removal(&config.refresh_cookie_name)]
}

/// Cookie 헤더에서 이름으로 값을 찾는다.
pub fn read_cookie(header: Option<&str>, name: &str) -> Option<String> {
    header?.split(';').find_map(|pair| {
        let (key, value) = pair.split_once('=')?;
        (key.trim() == name).then(|| value.trim().to_owned())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::platform::logging::LogFormat;

    fn config(secure: bool) -> BffConfig {
        BffConfig {
            port: 0,
            allowed_origins: vec!["http://localhost:3000".into()],
            access_cookie_name: "tooday_access".into(),
            refresh_cookie_name: "tooday_refresh".into(),
            cookie_secure: secure,
            jwt_secret: "test-secret".into(),
            access_ttl_ms: 60_000,
            refresh_idle_ttl_ms: 60_000,
            refresh_absolute_ttl_ms: 120_000,
            database_url: None,
            pg_pool_size: 1,
            redis_url: None,
            log_format: LogFormat::Pretty,
            log_requests: false,
        }
    }

    #[test]
    fn 액세스_쿠키는_httponly_lax이고_ttl을_초로_담는다() {
        assert_eq!(
            serialize_access_cookie(&config(false), "abc"),
            "tooday_access=abc; Max-Age=60; HttpOnly; SameSite=Lax; Path=/"
        );
    }

    #[test]
    fn 프로덕션에서는_secure가_붙는다() {
        assert!(serialize_access_cookie(&config(true), "abc").ends_with("; Secure"));
    }

    #[test]
    fn 리프레시_쿠키는_absolute_수명을_쓴다() {
        assert!(serialize_refresh_cookie(&config(false), "abc").contains("Max-Age=120;"));
    }

    #[test]
    fn 삭제_쿠키는_두_개_모두_max_age_0이다() {
        assert_eq!(
            serialize_auth_cookie_removals(&config(false)),
            vec!["tooday_access=; Max-Age=0; Path=/", "tooday_refresh=; Max-Age=0; Path=/"]
        );
    }

    #[test]
    fn 쿠키_헤더에서_이름으로_찾는다() {
        let header = Some("tooday_access=a1; tooday_refresh=r1");
        assert_eq!(read_cookie(header, "tooday_access"), Some("a1".into()));
        assert_eq!(read_cookie(header, "tooday_refresh"), Some("r1".into()));
        assert_eq!(read_cookie(header, "missing"), None);
        assert_eq!(read_cookie(None, "tooday_access"), None);
    }
}
