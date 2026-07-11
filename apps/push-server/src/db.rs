use tokio_postgres::Client;

/// 시작 시간이 된(due) 태스크 — 알림에 필요한 필드만.
/// date/start_at은 발송의 예정 일시이자 task_push_sends의 키다.
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

/// lease가 만료된 미완(pending) 발송 — 복구 경로가 집어간다.
pub struct RecoverableSend {
    pub task: DueTask,
    pub attempts: i32,
    /// 태스크가 여전히 이 일정의 todo인가 — 아니면 발송을 포기(abandoned)한다.
    pub still_valid: bool,
}

/// due 창 안에 있고 아직 발송 레코드가 없는 태스크.
///
/// - `status = 'todo'`: 이미 시작(doing)·완료(done)한 태스크는 시작 알림이 무의미.
/// - 레코드 존재 여부만 본다(상태 무관) — pending의 재시도는 복구 경로가 맡는다.
/// - 키가 (task_id, 예정 일시)라 일정이 바뀐 태스크는 새 일시로 다시 잡힌다.
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

/// 발송 점유(claim) — pending + lease로 삽입한다. 다른 인스턴스가 이미 점유했으면
/// false (인스턴스가 몇 대든 PK 충돌로 정확히 하나만 true).
/// 점유 후 프로세스가 죽어도 lease 만료 뒤 복구 경로가 이어받으므로 유실이 없다.
pub async fn claim_send(client: &Client, task: &DueTask, lease_secs: f64) -> anyhow::Result<bool> {
    let inserted = client
        .execute(
            "insert into task_push_sends (task_id, scheduled_date, scheduled_start_at, status, lease_until) \
             values (($1::text)::uuid, $2, $3, 'pending', now() + make_interval(secs => $4)) \
             on conflict do nothing",
            &[&task.id, &task.date, &task.start_at, &lease_secs],
        )
        .await?;
    Ok(inserted == 1)
}

/// 전달 확정 — 성공했거나 더 할 일이 없는 발송(토큰 없음, 실패가 전부 죽은 토큰).
pub async fn mark_sent(client: &Client, task: &DueTask) -> anyhow::Result<()> {
    client
        .execute(
            "update task_push_sends set status = 'sent', sent_at = now(), lease_until = null \
             where task_id = ($1::text)::uuid and scheduled_date = $2 and scheduled_start_at = $3",
            &[&task.id, &task.date, &task.start_at],
        )
        .await?;
    Ok(())
}

/// 전달 실패 기록 — attempts+1 후 상한 도달이면 failed(포기), 아니면 백오프만큼
/// lease를 미뤄 재시도를 예약한다. 포기했으면 true.
pub async fn mark_attempt_failed(
    client: &Client,
    task: &DueTask,
    max_attempts: i32,
    backoff_secs: f64,
) -> anyhow::Result<bool> {
    let row = client
        .query_one(
            "update task_push_sends set \
               attempts = attempts + 1, \
               status = case when attempts + 1 >= $4 then 'failed' else 'pending' end, \
               lease_until = case when attempts + 1 >= $4 then null \
                                  else now() + make_interval(secs => $5) end \
             where task_id = ($1::text)::uuid and scheduled_date = $2 and scheduled_start_at = $3 \
             returning status",
            &[
                &task.id,
                &task.date,
                &task.start_at,
                &max_attempts,
                &backoff_secs,
            ],
        )
        .await?;
    Ok(row.get::<_, String>(0) == "failed")
}

/// 발송 포기 — 태스크가 그새 삭제·완료·일정변경돼 알림이 무의미해진 경우.
/// (일정이 바뀐 태스크는 새 키로 다시 claim되므로 유실이 아니다.)
pub async fn mark_abandoned(client: &Client, task: &DueTask) -> anyhow::Result<()> {
    client
        .execute(
            "update task_push_sends set status = 'failed', lease_until = null \
             where task_id = ($1::text)::uuid and scheduled_date = $2 and scheduled_start_at = $3",
            &[&task.id, &task.date, &task.start_at],
        )
        .await?;
    Ok(())
}

/// lease가 만료된 pending 발송을 lease 연장과 동시에 집는다.
/// FOR UPDATE SKIP LOCKED — 여러 인스턴스가 동시에 복구를 돌려도 나눠 갖는다.
pub async fn pick_recoverable(
    client: &Client,
    lease_secs: f64,
    limit: i64,
) -> anyhow::Result<Vec<RecoverableSend>> {
    let rows = client
        .query(
            "with picked as ( \
               update task_push_sends s \
               set lease_until = now() + make_interval(secs => $1) \
               where (s.task_id, s.scheduled_date, s.scheduled_start_at) in ( \
                 select task_id, scheduled_date, scheduled_start_at from task_push_sends \
                 where status = 'pending' and lease_until < now() \
                 order by lease_until limit $2 \
                 for update skip locked) \
               returning s.task_id, s.scheduled_date, s.scheduled_start_at, s.attempts) \
             select p.task_id::text, t.user_id::text, t.title, \
                    p.scheduled_date, p.scheduled_start_at, p.attempts, \
                    (t.deleted_at is null and t.status = 'todo' \
                     and t.date = p.scheduled_date and t.start_at = p.scheduled_start_at) \
             from picked p join tasks t on t.id = p.task_id",
            &[&lease_secs, &limit],
        )
        .await?;
    Ok(rows
        .iter()
        .map(|row| RecoverableSend {
            task: DueTask {
                id: row.get(0),
                user_id: row.get(1),
                title: row.get(2),
                date: row.get(3),
                start_at: row.get(4),
            },
            attempts: row.get(5),
            still_valid: row.get(6),
        })
        .collect())
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

/// 발급자(FCM/APNs/Expo)가 무효 판정한 토큰 정리 — 서버 주도라 소유자 확인이 없다.
pub async fn delete_dead_token(client: &Client, token: &str) -> anyhow::Result<()> {
    client
        .execute("delete from push_subscriptions where token = $1", &[&token])
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
