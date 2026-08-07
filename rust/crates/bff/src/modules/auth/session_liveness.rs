use crate::modules::auth::access_token::AccessTokens;
use crate::modules::auth::ports::RefreshTokenStore;

/// 인증 핫패스의 단일 규칙 — tRPC 컨텍스트와 SSE 미들웨어가 공유한다.
///
/// 1) 액세스 JWT 서명·만료 검증(무상태)
/// 2) 세션 라이브니스 체크(sid) — 로그아웃/재사용 탐지로 폐기된 세션을 즉시 끊는다
///
/// 유효하고 세션이 살아있으면 userId, 아니면 None. 라이브니스 저장소가 응답하지 못하면
/// **fail-closed**로 거부한다(가용성보다 보안 우선).
pub async fn verify_live_session(
    token: Option<&str>,
    access_tokens: &dyn AccessTokens,
    refresh_tokens: &dyn RefreshTokenStore,
) -> Option<String> {
    let claims = access_tokens.verify(token?)?;
    match refresh_tokens.is_session_live(&claims.session_id).await {
        Ok(true) => Some(claims.user_id),
        Ok(false) => None,
        Err(_) => None, // fail-closed
    }
}
