//! 폼 인프라 — TS `apps/web/src/shared/form.ts` 대응.
//!
//! 스키마(`tooday_shared`)는 검증 규칙만 소유하고, 사용자향 문구는 화면이 소유한다.
//! 화면은 (필드, issue 종류) 조합에 문구를 매핑하고, 서버 에러는 전송 코드로 분기해
//! 특정 필드나 폼 레벨에 얹는다.

use std::collections::HashMap;

use tooday_shared::validate::{IssueKind, Validate, ValidationError};

use crate::app::trpc::{TrpcError, TrpcErrorCode};

/// 화면이 소유하는 검증 문구 맵 — `(필드, issue 종류) → 문구`.
/// 필드 이름은 계약 스키마의 필드명과 같아야 한다.
#[derive(Debug, Default, Clone)]
pub struct FormMessages {
    entries: Vec<(&'static str, IssueKind, String)>,
}

impl FormMessages {
    pub fn new() -> Self {
        Self::default()
    }

    /// 특정 필드의 특정 issue 종류에 문구를 붙인다
    pub fn on(mut self, field: &'static str, kind: IssueKind, message: impl Into<String>) -> Self {
        self.entries.push((field, kind, message.into()));
        self
    }

    fn lookup(&self, field: &str, kind: IssueKind) -> Option<&str> {
        self.entries
            .iter()
            .find(|(candidate, candidate_kind, _)| *candidate == field && *candidate_kind == kind)
            .map(|(_, _, message)| message.as_str())
    }
}

/// 폼의 현재 에러 — 필드별 문구 + 필드에 귀속되지 않는 폼 레벨 문구.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct FormErrors {
    fields: HashMap<String, String>,
    form: Option<String>,
}

impl FormErrors {
    pub fn field(&self, name: &str) -> Option<String> {
        self.fields.get(name).cloned()
    }

    pub fn form(&self) -> Option<String> {
        self.form.clone()
    }

    pub fn is_empty(&self) -> bool {
        self.fields.is_empty() && self.form.is_none()
    }

    /// 특정 필드에 서버 에러를 얹는다 — TS `fieldErrors`
    pub fn with_field(mut self, name: &str, message: impl Into<String>) -> Self {
        self.fields.insert(name.to_owned(), message.into());
        self
    }

    /// 필드에 귀속되지 않는 폼 레벨 에러 — TS `formError`
    pub fn with_form(mut self, message: impl Into<String>) -> Self {
        self.form = Some(message.into());
        self
    }
}

/// 스키마 검증 실패를 화면 소유 문구로 옮긴다.
/// 매핑이 없는 issue는 스키마의 기본 문구를 그대로 쓴다.
pub fn errors_from_validation(error: &ValidationError, messages: &FormMessages) -> FormErrors {
    let mut form_errors = FormErrors::default();
    for issue in error.issues() {
        let field = issue.path.first().map(String::as_str).unwrap_or_default();
        let message = messages.lookup(field, issue.kind).unwrap_or(&issue.message);
        // 같은 필드에 여러 issue가 있으면 첫 번째만 보여준다 (TS `errors[0]`과 같다)
        form_errors.fields.entry(field.to_owned()).or_insert_with(|| message.to_owned());
    }
    form_errors
}

/// 계약 타입으로 파싱하고, 실패하면 화면 문구로 옮긴 에러를 돌려준다.
pub fn validate<T: Validate>(input: T, messages: &FormMessages) -> Result<T, FormErrors> {
    input.parse().map_err(|error| errors_from_validation(&error, messages))
}

pub fn has_trpc_error_code(error: &TrpcError, code: TrpcErrorCode) -> bool {
    error.has_code(code)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tooday_shared::SignupRequest;

    fn messages() -> FormMessages {
        FormMessages::new()
            .on("name", IssueKind::MinLength, "이름을 입력해 주세요.")
            .on("email", IssueKind::Email, "올바른 이메일을 입력해 주세요.")
            .on("password", IssueKind::MinLength, "비밀번호는 8자 이상 입력해 주세요.")
    }

    fn signup(email: &str, password: &str, name: &str) -> SignupRequest {
        SignupRequest { email: email.into(), password: password.into(), name: name.into() }
    }

    #[test]
    fn 유효한_입력은_통과하고_트림된다() {
        let parsed =
            validate(signup(" a@b.com ", "password123", " 홍길동 "), &messages()).expect("통과해야 한다");
        assert_eq!(parsed.email, "a@b.com");
        assert_eq!(parsed.name, "홍길동");
    }

    #[test]
    fn issue를_화면_소유_문구로_옮긴다() {
        let errors = validate(signup("nope", "short", ""), &messages()).expect_err("실패해야 한다");
        assert_eq!(errors.field("email").as_deref(), Some("올바른 이메일을 입력해 주세요."));
        assert_eq!(errors.field("password").as_deref(), Some("비밀번호는 8자 이상 입력해 주세요."));
        assert_eq!(errors.field("name").as_deref(), Some("이름을 입력해 주세요."));
    }

    #[test]
    fn 매핑이_없으면_스키마_기본_문구를_쓴다() {
        let errors = validate(signup("nope", "password123", "홍길동"), &FormMessages::new())
            .expect_err("실패해야 한다");
        let message = errors.field("email").expect("이메일 에러");
        assert!(message.contains("Invalid email"), "{message}");
    }

    #[test]
    fn 서버_에러를_필드나_폼에_얹는다() {
        let errors = FormErrors::default().with_field("email", "이미 가입된 이메일입니다.");
        assert_eq!(errors.field("email").as_deref(), Some("이미 가입된 이메일입니다."));
        assert_eq!(errors.form(), None);

        let errors = FormErrors::default().with_form("문제가 발생했습니다.");
        assert_eq!(errors.form().as_deref(), Some("문제가 발생했습니다."));
        assert!(errors.field("email").is_none());
    }

    #[test]
    fn 전송_코드로_분기한다() {
        let conflict = TrpcError::Procedure { code: TrpcErrorCode::Conflict, message: "중복".into() };
        assert!(has_trpc_error_code(&conflict, TrpcErrorCode::Conflict));
        assert!(!has_trpc_error_code(&conflict, TrpcErrorCode::Unauthorized));
        assert!(!has_trpc_error_code(&TrpcError::Transport("네트워크".into()), TrpcErrorCode::Conflict));
    }
}
