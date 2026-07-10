//! 유저별 단조증가 동기화 시퀀스 발급 — BFF `platform/db/sync.ts` 이관.
//!
//! 유저 단위 advisory lock으로 같은 유저의 쓰기를 직렬화한다 — seq 발급 순서와
//! 커밋 순서가 일치해야, 델타를 당기는 클라이언트가 "커서 사이에 낀 미커밋 행"을
//! 영영 놓치는 구멍이 안 생긴다. 잠금은 트랜잭션 커밋 시 자동 해제된다.
//! (한 유저의 쓰기 빈도는 사람 손 속도라 직렬화 비용은 사실상 0이다.)

use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::error::ApiResult;

/// 쓰기 트랜잭션을 열고 sync seq를 발급한다. 호출자가 쓰기를 마치고 commit해야 한다.
pub async fn begin_user_write(pool: &PgPool, user_id: Uuid) -> ApiResult<(Transaction<'static, Postgres>, i32)> {
    let mut tx = pool.begin().await?;
    // hashtext 인자는 BFF 시절과 동일하게 uuid의 텍스트 표현 — 잠금 키가 갈리지 않게 한다.
    sqlx::query("select pg_advisory_xact_lock(hashtext($1))")
        .bind(user_id.to_string())
        .execute(&mut *tx)
        .await?;
    let seq: i32 = sqlx::query_scalar(
        "insert into sync_counters (user_id, seq) values ($1, 1)
         on conflict (user_id) do update set seq = sync_counters.seq + 1
         returning seq",
    )
    .bind(user_id)
    .fetch_one(&mut *tx)
    .await?;
    Ok((tx, seq))
}

/// 유저의 현재 seq — 클라이언트 초기 커서. 카운터 행이 없으면(쓰기 전) 0
pub async fn current_sync_seq(pool: &PgPool, user_id: Uuid) -> ApiResult<i32> {
    let seq: Option<i32> = sqlx::query_scalar("select seq from sync_counters where user_id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await?;
    Ok(seq.unwrap_or(0))
}
