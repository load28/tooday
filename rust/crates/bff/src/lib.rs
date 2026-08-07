//! TooDay BFF — axum + tRPC 호환 라우터.
//!
//! 디렉토리 전략: 도메인 수직 슬라이스 + 헥사고날 라이트.
//! - `modules/<domain>/` — 포트·어댑터·tRPC 라우터 코로케이션 (모듈 간 직접 참조 금지)
//! - `platform/` — 도메인 무관 인프라 (platform → modules 역참조 금지)
//! - `trpc/` — tRPC 접착 코드: init, context, cache + 라우터 조립

pub mod app;
pub mod modules;
pub mod platform;
pub mod trpc;
