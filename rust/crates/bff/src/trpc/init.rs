//! tRPC 접착 코드 — 프로시저 선언과 에러 매핑.
//!
//! TS는 `publicProcedure` / `protectedProcedure` / `sessionProcedure`를 미들웨어
//! 체인으로 만들었다. 러스트에서는 프로시저가 자기 인증 수준을 [`AuthLevel`]로 선언하고
//! 디스패처가 같은 규칙을 강제한다 — 규칙이 한 곳에 남는다는 성질은 그대로다.

use serde::de::DeserializeOwned;
use serde_json::Value;
use tooday_shared::validate::{Validate, ValidationError};

use crate::platform::errors::{DomainError, DomainErrorCode, StoreError};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProcedureKind {
    Query,
    Mutation,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuthLevel {
    /// 인증 없이 통과
    Public,
    /// userId가 없으면 UNAUTHENTICATED
    Protected,
    /// 세션 프로브 — "너 누구냐"를 인증 강제 없이 묻는다. 무효 자격증명(만료·폐기)은
    /// 401로 거르되, 자격증명이 아예 없으면(익명) userId=None으로 통과시킨다. 그래서
    /// 리졸버의 `userId.is_none()`은 "무효"가 아니라 "익명"만 뜻한다. 응답이 요청자에
    /// 따라 달라지므로 pub.*(공유 캐시)로 두면 안 되고 private 네임스페이스에서만 쓴다.
    Session,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Procedure {
    pub name: &'static str,
    pub kind: ProcedureKind,
    pub auth: AuthLevel,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrpcErrorCode {
    ParseError,
    BadRequest,
    Unauthorized,
    NotFound,
    MethodNotSupported,
    Conflict,
    InternalServerError,
}

impl TrpcErrorCode {
    pub fn as_str(self) -> &'static str {
        match self {
            TrpcErrorCode::ParseError => "PARSE_ERROR",
            TrpcErrorCode::BadRequest => "BAD_REQUEST",
            TrpcErrorCode::Unauthorized => "UNAUTHORIZED",
            TrpcErrorCode::NotFound => "NOT_FOUND",
            TrpcErrorCode::MethodNotSupported => "METHOD_NOT_SUPPORTED",
            TrpcErrorCode::Conflict => "CONFLICT",
            TrpcErrorCode::InternalServerError => "INTERNAL_SERVER_ERROR",
        }
    }

    pub fn http_status(self) -> u16 {
        match self {
            TrpcErrorCode::ParseError | TrpcErrorCode::BadRequest => 400,
            TrpcErrorCode::Unauthorized => 401,
            TrpcErrorCode::NotFound => 404,
            TrpcErrorCode::MethodNotSupported => 405,
            TrpcErrorCode::Conflict => 409,
            TrpcErrorCode::InternalServerError => 500,
        }
    }

    /// tRPC가 JSON-RPC 봉투에 싣는 숫자 코드
    pub fn json_rpc_code(self) -> i32 {
        match self {
            TrpcErrorCode::ParseError => -32700,
            TrpcErrorCode::BadRequest => -32600,
            TrpcErrorCode::InternalServerError => -32603,
            TrpcErrorCode::Unauthorized => -32001,
            TrpcErrorCode::NotFound => -32004,
            TrpcErrorCode::MethodNotSupported => -32005,
            TrpcErrorCode::Conflict => -32009,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrpcError {
    pub code: TrpcErrorCode,
    pub message: String,
}

impl TrpcError {
    pub fn new(code: TrpcErrorCode, message: impl Into<String>) -> Self {
        Self { code, message: message.into() }
    }
}

/// DomainError를 tRPC 에러(HTTP 상태)로 변환하는 유일한 지점
impl From<DomainError> for TrpcError {
    fn from(error: DomainError) -> Self {
        let code = match error.code {
            DomainErrorCode::EmailTaken => TrpcErrorCode::Conflict,
            DomainErrorCode::InvalidCredentials => TrpcErrorCode::Unauthorized,
            DomainErrorCode::Unauthenticated => TrpcErrorCode::Unauthorized,
            DomainErrorCode::ProjectNotFound => TrpcErrorCode::NotFound,
            DomainErrorCode::TaskNotFound => TrpcErrorCode::NotFound,
        };
        TrpcError::new(code, error.message)
    }
}

impl From<StoreError> for TrpcError {
    fn from(error: StoreError) -> Self {
        match error {
            StoreError::Domain(domain) => domain.into(),
            StoreError::Infrastructure(message) => {
                TrpcError::new(TrpcErrorCode::InternalServerError, message)
            }
        }
    }
}

/// 입력 검증 실패는 400 — valibot 스키마가 tRPC input parser로 붙어 있던 것과 같다.
impl From<ValidationError> for TrpcError {
    fn from(error: ValidationError) -> Self {
        TrpcError::new(TrpcErrorCode::BadRequest, error.to_string())
    }
}

pub fn unauthenticated() -> TrpcError {
    DomainError::new(DomainErrorCode::Unauthenticated).into()
}

/// 프로시저 입력 파싱 — 역직렬화 실패도 스키마 위반도 400이다.
pub fn parse_input<T: DeserializeOwned + Validate>(input: Option<Value>) -> Result<T, TrpcError> {
    let raw = input.unwrap_or(Value::Null);
    let parsed: T = serde_json::from_value(raw)
        .map_err(|error| TrpcError::new(TrpcErrorCode::BadRequest, error.to_string()))?;
    Ok(parsed.parse()?)
}

/// 출력 직렬화 — 계약 타입만 넣으므로 실패하지 않는다.
pub fn output<T: serde::Serialize>(value: T) -> Result<Value, TrpcError> {
    serde_json::to_value(value)
        .map_err(|error| TrpcError::new(TrpcErrorCode::InternalServerError, error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 도메인_에러가_http_상태로_매핑된다() {
        let cases = [
            (DomainErrorCode::EmailTaken, 409),
            (DomainErrorCode::InvalidCredentials, 401),
            (DomainErrorCode::Unauthenticated, 401),
            (DomainErrorCode::ProjectNotFound, 404),
            (DomainErrorCode::TaskNotFound, 404),
        ];
        for (code, status) in cases {
            let error: TrpcError = DomainError::new(code).into();
            assert_eq!(error.code.http_status(), status, "{code:?}");
        }
    }

    #[test]
    fn 인프라_실패는_500이다() {
        let error: TrpcError = StoreError::Infrastructure("db down".into()).into();
        assert_eq!(error.code, TrpcErrorCode::InternalServerError);
    }

    #[test]
    fn 도메인_에러_메시지가_보존된다() {
        let error: TrpcError = DomainError::new(DomainErrorCode::EmailTaken).into();
        assert_eq!(error.message, "이미 가입된 이메일입니다.");
    }
}
