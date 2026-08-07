use async_trait::async_trait;
use tooday_shared::User;

use crate::platform::errors::StoreResult;

/// user 도메인 조회 포트 — 읽기 전용.
/// users 테이블의 소유·쓰기는 auth 모듈(계정 생성·자격 증명)에 있다(단일 작성자).
/// 이 포트는 그 데이터에 대한 user 모듈 소유의 읽기 계약이다.
#[async_trait]
pub trait UserReader: Send + Sync {
    async fn find_by_id(&self, id: &str) -> StoreResult<Option<User>>;
}
