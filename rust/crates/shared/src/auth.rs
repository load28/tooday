use serde::{Deserialize, Serialize};

use crate::user::User;
use crate::validate::{email, min_length, Issues, Validate};

pub const MIN_PASSWORD_LENGTH: usize = 8;

// 스키마는 검증 규칙(계약)만 정의한다. 사용자향 문구는 각 화면이 발생 가능한
// issue 타입으로 매핑해 소유한다.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SignupRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

impl Validate for SignupRequest {
    fn normalize(&mut self) {
        self.email = self.email.trim().to_owned();
        self.name = self.name.trim().to_owned();
    }

    fn collect_issues(&self, issues: &mut Issues) {
        email(issues, "email", &self.email);
        min_length(issues, "password", &self.password, MIN_PASSWORD_LENGTH);
        min_length(issues, "name", &self.name, 1);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

impl Validate for LoginRequest {
    fn normalize(&mut self) {
        self.email = self.email.trim().to_owned();
    }

    fn collect_issues(&self, issues: &mut Issues) {
        min_length(issues, "email", &self.email, 1);
        min_length(issues, "password", &self.password, 1);
    }
}

/// 토큰 쌍. 웹은 이 값을 무시하고 httpOnly 쿠키(Set-Cookie)로 인증하지만,
/// 네이티브/웹뷰 브릿지는 쿠키를 못 쓰므로 body로 받아 Authorization 헤더에 싣는다.
/// - accessToken: 무상태 JWT(짧음). 매 요청 서명 검증만으로 인증.
/// - refreshToken: 불투명 문자열(김). 액세스 만료 시 재발급받는 용도.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthResponse {
    pub user: User,
    pub access_token: String,
    pub refresh_token: String,
}

/// 리프레시 회전 요청. 웹은 body 없이 리프레시 쿠키로 인증하고, 네이티브/웹뷰
/// 브릿지는 쿠키를 못 쓰므로 refreshToken을 body로 넘긴다 — 둘 다 지원하도록 optional.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshRequest {
    #[serde(default)]
    pub refresh_token: Option<String>,
}

impl Validate for RefreshRequest {
    fn collect_issues(&self, _issues: &mut Issues) {}
}

/// 리프레시 회전 결과 — 새 토큰 쌍만 돌려준다(웹은 쿠키로도 함께 받음)
pub type RefreshResponse = TokenPair;

/// `auth.logout` 응답 봉투
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LogoutResponse {
    pub ok: bool,
}
