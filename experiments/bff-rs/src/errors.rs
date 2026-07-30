//! 도메인 에러와 전송 계층 매핑. `apps/bff/src/platform/errors.ts` +
//! `apps/bff/src/trpc/init.ts`의 `TRPC_CODE_BY_DOMAIN_CODE` 포팅.
//!
//! TS는 `as const satisfies Record<DomainErrorCode, TRPCError['code']>`로
//! "모든 코드가 매핑됐나"를 컴파일 타임에 확인한다. Rust는 `match`가 exhaustive라
//! 같은 보장을 언어 기본으로 얻는다 — 변형을 추가하면 매핑 함수가 컴파일 에러난다.

use std::fmt;

/// 도메인 계층(스토어·라우터)이 던지는 유일한 에러. 전송 매핑은 `transport_code`가 담당.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DomainError {
    EmailTaken,
    InvalidCredentials,
    Unauthenticated,
    ProjectNotFound,
    TaskNotFound,
}

/// tRPC 에러 코드(HTTP 상태로 매핑되는) 중 이 앱이 실제로 쓰는 부분집합.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransportCode {
    Conflict,     // 409
    Unauthorized, // 401
    NotFound,     // 404
}

impl DomainError {
    /// DomainError → 전송 코드. `match`가 exhaustive라 변형 누락 시 컴파일 에러.
    pub fn transport_code(self) -> TransportCode {
        match self {
            DomainError::EmailTaken => TransportCode::Conflict,
            DomainError::InvalidCredentials => TransportCode::Unauthorized,
            DomainError::Unauthenticated => TransportCode::Unauthorized,
            DomainError::ProjectNotFound => TransportCode::NotFound,
            DomainError::TaskNotFound => TransportCode::NotFound,
        }
    }

    /// 표준 사용자 메시지. 코드로만 조회하게 두어 메시지 테이블을 노출하지 않는다.
    pub fn message(self) -> &'static str {
        match self {
            DomainError::EmailTaken => "이미 가입된 이메일입니다.",
            DomainError::InvalidCredentials => "이메일 또는 비밀번호가 올바르지 않습니다.",
            DomainError::Unauthenticated => "인증이 필요합니다.",
            DomainError::ProjectNotFound => "프로젝트를 찾을 수 없습니다.",
            DomainError::TaskNotFound => "작업을 찾을 수 없습니다.",
        }
    }
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message())
    }
}
impl std::error::Error for DomainError {}
