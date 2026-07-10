use uuid::Uuid;

/// 엔티티 ID는 UUIDv7(시간순) — B-tree 삽입 지역성 + 시간순 커서 키. BFF 시절과 동일 규약.
pub fn new_id() -> Uuid {
    Uuid::now_v7()
}
