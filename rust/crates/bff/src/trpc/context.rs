use std::sync::Arc;

use tooday_shared::TokenPair;

use crate::modules::auth::access_token::AccessTokens;
use crate::modules::auth::cookies::{
    read_cookie, serialize_access_cookie, serialize_auth_cookie_removals, serialize_refresh_cookie,
};
use crate::modules::auth::ports::RefreshTokenStore;
use crate::modules::auth::session_liveness::verify_live_session;
use crate::modules::auth::token::extract_access_token;
use crate::platform::config::BffConfig;

pub struct TrpcContext {
    /// 액세스 JWT 검증 결과. pub.* 프로시저는 참조 금지(응답이 공유 캐시에 저장된다).
    pub user_id: Option<String>,
    /// 요청에 인증 자격증명이 실렸는지 — 액세스 토큰(Bearer 헤더/쿠키) 또는 리프레시 쿠키.
    /// user_id가 None일 때 401(무효 → refresh 챌린지)과 200+null(익명)을 가르는 신호다.
    pub has_credential: bool,
    /// 리프레시 쿠키 — auth.refresh(회전)와 logout(폐기)용
    pub refresh_token: Option<String>,
    /// 응답에 실을 Set-Cookie — TS의 `resHeaders.append`에 대응
    pub set_cookies: Vec<String>,
    config: Arc<BffConfig>,
}

impl TrpcContext {
    /// 인증 핫패스 — 액세스 JWT 검증 + 세션 라이브니스 체크(즉시 무효화). 유저 조회는 안 탐.
    pub async fn create(
        config: Arc<BffConfig>,
        access_tokens: &dyn AccessTokens,
        refresh_tokens: &dyn RefreshTokenStore,
        authorization: Option<&str>,
        cookie_header: Option<&str>,
    ) -> Self {
        let access_token = extract_access_token(authorization, cookie_header, &config.access_cookie_name);
        let user_id = verify_live_session(access_token.as_deref(), access_tokens, refresh_tokens).await;
        let refresh_token = read_cookie(cookie_header, &config.refresh_cookie_name);

        Self {
            user_id,
            has_credential: access_token.is_some() || refresh_token.is_some(),
            refresh_token,
            set_cookies: Vec::new(),
            config,
        }
    }

    pub fn set_auth_cookies(&mut self, tokens: &TokenPair) {
        self.set_cookies.push(serialize_access_cookie(&self.config, &tokens.access_token));
        self.set_cookies.push(serialize_refresh_cookie(&self.config, &tokens.refresh_token));
    }

    pub fn clear_auth_cookies(&mut self) {
        self.set_cookies.extend(serialize_auth_cookie_removals(&self.config));
    }
}
