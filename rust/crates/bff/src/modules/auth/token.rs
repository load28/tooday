use crate::modules::auth::cookies::read_cookie;

/// 액세스 토큰(JWT) 추출 — Authorization: Bearer 헤더 우선(네이티브/웹뷰 브릿지),
/// 없으면 httpOnly 액세스 쿠키(웹).
pub fn extract_access_token(
    authorization: Option<&str>,
    cookie_header: Option<&str>,
    cookie_name: &str,
) -> Option<String> {
    if let Some(authorization) = authorization {
        let mut parts = authorization.split_whitespace();
        let scheme = parts.next().unwrap_or_default();
        let token = parts.next().unwrap_or_default();
        if scheme.eq_ignore_ascii_case("bearer") && !token.is_empty() {
            return Some(token.to_owned());
        }
        // Authorization이 있는데 Bearer가 아니면 쿠키로 폴백한다 (TS와 같은 분기)
        return read_cookie(cookie_header, cookie_name);
    }
    read_cookie(cookie_header, cookie_name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bearer_헤더가_쿠키보다_우선한다() {
        let token = extract_access_token(
            Some("Bearer header-token"),
            Some("tooday_access=cookie-token"),
            "tooday_access",
        );
        assert_eq!(token, Some("header-token".into()));
    }

    #[test]
    fn 헤더가_없으면_쿠키를_쓴다() {
        assert_eq!(
            extract_access_token(None, Some("tooday_access=cookie-token"), "tooday_access"),
            Some("cookie-token".into())
        );
    }

    #[test]
    fn 대소문자_구분_없이_bearer를_읽는다() {
        assert_eq!(extract_access_token(Some("bearer t"), None, "tooday_access"), Some("t".into()));
        assert_eq!(extract_access_token(Some("BEARER t"), None, "tooday_access"), Some("t".into()));
    }

    #[test]
    fn 자격증명이_없으면_none이다() {
        assert_eq!(extract_access_token(None, None, "tooday_access"), None);
        assert_eq!(extract_access_token(Some("Bearer"), None, "tooday_access"), None);
    }
}
