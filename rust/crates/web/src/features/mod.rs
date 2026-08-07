//! 화면·폼·쿼리 등 기능 코드.
//! feature 간 직접 import 금지 — 도메인 공용은 entities/, 도메인 무관은 shared/,
//! 조립은 routes/가 한다.

pub mod auth;
pub mod projects;
pub mod tasks;
pub mod today;
