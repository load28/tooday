use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DomainErrorCode {
    EmailTaken,
    InvalidCredentials,
    Unauthenticated,
    ProjectNotFound,
    TaskNotFound,
}

impl DomainErrorCode {
    pub fn as_str(self) -> &'static str {
        match self {
            DomainErrorCode::EmailTaken => "EMAIL_TAKEN",
            DomainErrorCode::InvalidCredentials => "INVALID_CREDENTIALS",
            DomainErrorCode::Unauthenticated => "UNAUTHENTICATED",
            DomainErrorCode::ProjectNotFound => "PROJECT_NOT_FOUND",
            DomainErrorCode::TaskNotFound => "TASK_NOT_FOUND",
        }
    }

    /// 도메인 에러 코드의 표준 사용자 메시지.
    /// 메시지 테이블을 노출하지 않고 코드로만 조회하게 한다.
    pub fn message(self) -> &'static str {
        match self {
            DomainErrorCode::EmailTaken => "이미 가입된 이메일입니다.",
            DomainErrorCode::InvalidCredentials => "이메일 또는 비밀번호가 올바르지 않습니다.",
            DomainErrorCode::Unauthenticated => "인증이 필요합니다.",
            DomainErrorCode::ProjectNotFound => "프로젝트를 찾을 수 없습니다.",
            DomainErrorCode::TaskNotFound => "작업을 찾을 수 없습니다.",
        }
    }
}

/// 도메인 계층(스토어, 라우터)이 던지는 유일한 에러 타입.
/// 전송 계층 매핑은 `trpc::init`이 담당한다.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DomainError {
    pub code: DomainErrorCode,
    pub message: String,
}

impl DomainError {
    pub fn new(code: DomainErrorCode) -> Self {
        Self { code, message: code.message().to_owned() }
    }

    pub fn with_message(code: DomainErrorCode, message: impl Into<String>) -> Self {
        Self { code, message: message.into() }
    }
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for DomainError {}

/// 스토어 계층이 낼 수 있는 실패 — 도메인 에러이거나 인프라 장애다.
/// TS는 예외 하나로 섞였지만 러스트는 Result로 갈라 호출부가 놓칠 수 없게 한다.
#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error(transparent)]
    Domain(#[from] DomainError),
    /// 저장소·드라이버 장애 — 전송 계층에서 500으로 매핑된다
    #[error("infrastructure failure: {0}")]
    Infrastructure(String),
}

impl StoreError {
    pub fn infrastructure(error: impl fmt::Display) -> Self {
        StoreError::Infrastructure(error.to_string())
    }

    /// 원인 사슬을 따라 도메인 에러를 찾는다 — TS `findDomainError` 대응
    pub fn find_domain(&self) -> Option<&DomainError> {
        match self {
            StoreError::Domain(error) => Some(error),
            StoreError::Infrastructure(_) => None,
        }
    }
}

pub type StoreResult<T> = Result<T, StoreError>;

pub fn domain<T>(code: DomainErrorCode) -> StoreResult<T> {
    Err(StoreError::Domain(DomainError::new(code)))
}
