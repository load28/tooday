use sqlx::{PgPool, Postgres, Transaction};

/*
 * 위치 근거(platform 유지): 현재 유일한 호출처는 task 어댑터이지만, 유저별 단조증가 seq 발급은
 * 도메인 무관한 델타 동기화 기반 설비다 — 기준 테이블 `sync_counters`도 여기서 정의되고
 * 발급 규약이 거기 못박혀 있다. 이 원리(스냅샷+seq+커서)는 태스크 공유 등 타 도메인으로
 * 재사용될 설계이므로 platform에 둔다.
 */

/// 동기화 seq를 발급한 트랜잭션을 연다.
///
/// 유저 단위 advisory lock으로 같은 유저의 쓰기를 직렬화한다 — seq 발급 순서와
/// 커밋 순서가 일치해야, 델타를 당기는 클라이언트가 "커서 사이에 낀 미커밋 행"을
/// 영영 놓치는 구멍이 안 생긴다. 잠금은 트랜잭션 커밋 시 자동 해제된다.
/// (한 유저의 쓰기 빈도는 사람 손 속도라 직렬화 비용은 사실상 0이다.)
pub async fn begin_with_sync_seq<'a>(
    pool: &'a PgPool,
    user_id: &str,
) -> Result<(Transaction<'a, Postgres>, i64), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query("select pg_advisory_xact_lock(hashtext($1))").bind(user_id).execute(&mut *tx).await?;
    let (seq,): (i32,) = sqlx::query_as(
        r#"insert into sync_counters (user_id, seq) values ($1::uuid, 1)
           on conflict (user_id) do update set seq = sync_counters.seq + 1
           returning seq"#,
    )
    .bind(user_id)
    .fetch_one(&mut *tx)
    .await?;
    Ok((tx, seq as i64))
}

/// 유저의 현재 seq — 클라이언트 초기 커서. 카운터 행이 없으면(쓰기 전) 0
pub async fn current_sync_seq(pool: &PgPool, user_id: &str) -> Result<i64, sqlx::Error> {
    let row: Option<(i32,)> = sqlx::query_as("select seq from sync_counters where user_id = $1::uuid")
        .bind(user_id)
        .fetch_optional(pool)
        .await?;
    Ok(row.map(|(seq,)| seq as i64).unwrap_or(0))
}
