//! 도메인 무관 인프라 — db, config, errors, logging, http.
//! platform → modules 역참조 금지.

pub mod config;
pub mod db;
pub mod errors;
pub mod http;
pub mod ids;
pub mod logging;
pub mod ordering;
pub mod password;
pub mod sync_broker;
