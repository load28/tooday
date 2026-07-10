use tokio_postgres::Client;

/// 시작 시간이 된(due) 태스크 — 알림에 필요한 필드만.
pub struct DueTask {
    pub id: String,
    pub user_id: String,
    pub title: String,
    /// 'YYYY-MM-DD'
    pub date: String,
    /// 'HH:mm'
    pub start_at: String,
}

pub struct PushTarget {
    pub token: String,
    pub platform: String,
}

/// due 창 안에 있고 아직 발송 기록이 없는 태스크.
///
/// - `status = 'todo'`: 이미 시작(doing)·완료(done)한 태스크는 시작 알림이 무의미.
/// - dedup 키가 (task_id, 예정 일시)라 일정이 바뀐 태스크는 새 일시로 다시 잡힌다.
pub async fn fetch_due_tasks(
    client: &Client,
    from: &str,
    to: &str,
) -> anyhow::Result<Vec<DueTask>> {
    let rows = client
        .query(
            "select t.id::text, t.user_id::text, t.title, t.date, t.start_at \
             from tasks t \
             where t.deleted_at is null \
               and t.status = 'todo' \
               and (t.date || ' ' || t.start_at) between $1 and $2 \
               and not exists ( \
                 select 1 from task_push_sends s \
                 where s.task_id = t.id \
                   and s.scheduled_date = t.date \
                   and s.scheduled_start_at = t.start_at) \
             order by t.date, t.start_at",
            &[&from, &to],
        )
        .await?;
    Ok(rows
        .iter()
        .map(|row| DueTask {
            id: row.get(0),
            user_id: row.get(1),
            title: row.get(2),
            date: row.get(3),
            start_at: row.get(4),
        })
        .collect())
}

/// 발송 점유(claim) — 다른 인스턴스가 이미 점유했으면 false. 인스턴스가 몇 대든
/// PK 충돌로 정확히 하나만 true를 받는다.
pub async fn claim_send(client: &Client, task: &DueTask) -> anyhow::Result<bool> {
    let inserted = client
        .execute(
            "insert into task_push_sends (task_id, scheduled_date, scheduled_start_at) \
             values (($1::text)::uuid, $2, $3) on conflict do nothing",
            &[&task.id, &task.date, &task.start_at],
        )
        .await?;
    Ok(inserted == 1)
}

/// 발송이 전부 실패했을 때 점유를 되돌린다 — lookback 창 안이면 다음 틱에 재시도된다.
pub async fn release_claim(client: &Client, task: &DueTask) -> anyhow::Result<()> {
    client
        .execute(
            "delete from task_push_sends \
             where task_id = ($1::text)::uuid and scheduled_date = $2 and scheduled_start_at = $3",
            &[&task.id, &task.date, &task.start_at],
        )
        .await?;
    Ok(())
}

/// 구독 upsert — 같은 토큰이 다시 오면(재로그인·계정 전환) 최신 유저·플랫폼으로 덮는다.
pub async fn upsert_subscription(
    client: &Client,
    token: &str,
    user_id: &str,
    platform: &str,
) -> anyhow::Result<()> {
    client
        .execute(
            "insert into push_subscriptions (token, user_id, platform) \
             values ($1, ($2::text)::uuid, $3) \
             on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform",
            &[&token, &user_id, &platform],
        )
        .await?;
    Ok(())
}

/// 본인 소유 구독만 지운다 — 다른 유저의 토큰은 건드리지 못한다.
pub async fn delete_subscription(
    client: &Client,
    token: &str,
    user_id: &str,
) -> anyhow::Result<()> {
    client
        .execute(
            "delete from push_subscriptions where token = $1 and user_id = ($2::text)::uuid",
            &[&token, &user_id],
        )
        .await?;
    Ok(())
}

pub async fn fetch_targets(client: &Client, user_id: &str) -> anyhow::Result<Vec<PushTarget>> {
    let rows = client
        .query(
            "select token, platform from push_subscriptions where user_id = ($1::text)::uuid",
            &[&user_id],
        )
        .await?;
    Ok(rows
        .iter()
        .map(|row| PushTarget {
            token: row.get(0),
            platform: row.get(1),
        })
        .collect())
}
