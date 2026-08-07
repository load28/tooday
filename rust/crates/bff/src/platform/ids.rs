//! 엔티티 ID는 UUIDv7(시간순) — 랜덤(v4)과 달리 B-tree 삽입 지역성이 있어
//! 대량 쓰기에서 페이지 분할이 줄고, 시간순이라 커서 페이지네이션 키로도 쓸 수 있다.

pub fn new_id() -> String {
    uuid::Uuid::now_v7().to_string()
}
