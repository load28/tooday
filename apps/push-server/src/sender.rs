use std::time::Duration;

use serde::Deserialize;
use serde_json::json;

use crate::config::SenderKind;
use crate::db::{DueTask, PushTarget};

pub struct PushMessage {
    pub token: String,
    pub platform: String,
    pub title: String,
    pub body: String,
    pub task_id: String,
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum SendStatus {
    Sent,
    /// 발급자가 토큰 무효 판정(앱 삭제 등) — 재시도 무의미, 구독을 지워야 한다.
    DeadToken,
    /// 일시 실패(네트워크·게이트웨이 오류 등) — 재시도 대상.
    Failed,
}

pub struct SendOutcome {
    pub token: String,
    pub status: SendStatus,
}

/// 알림 문구 — 제목은 태스크 제목, 본문에 예정 시각. 클라이언트가 태스크 화면으로
/// 이동할 수 있게 data에 taskId를 싣는다.
pub fn build_messages(task: &DueTask, targets: &[PushTarget]) -> Vec<PushMessage> {
    targets
        .iter()
        .map(|target| PushMessage {
            token: target.token.clone(),
            platform: target.platform.clone(),
            title: task.title.clone(),
            body: format!(
                "{} 시작 예정인 태스크예요. 지금 시작해 보세요.",
                task.start_at
            ),
            task_id: task.id.clone(),
        })
        .collect()
}

pub enum Sender {
    Log,
    Expo { http: reqwest::Client },
}

impl Sender {
    pub fn new(kind: SenderKind) -> anyhow::Result<Self> {
        Ok(match kind {
            SenderKind::Log => Sender::Log,
            SenderKind::Expo => Sender::Expo {
                http: reqwest::Client::builder()
                    .timeout(Duration::from_secs(10))
                    .build()?,
            },
        })
    }

    /// 토큰별 전달 결과를 돌려준다. 상태 확정(재시도·포기·토큰 정리)은
    /// 호출부(scheduler)가 결정한다.
    pub async fn send(&self, messages: &[PushMessage]) -> Vec<SendOutcome> {
        match self {
            Sender::Log => messages
                .iter()
                .map(|msg| {
                    tracing::info!(
                        token = %msg.token,
                        platform = %msg.platform,
                        title = %msg.title,
                        body = %msg.body,
                        task_id = %msg.task_id,
                        "푸시 발송 (log 발송기 — 실제 발송 없음)"
                    );
                    SendOutcome {
                        token: msg.token.clone(),
                        status: SendStatus::Sent,
                    }
                })
                .collect(),
            Sender::Expo { http } => send_expo(http, messages).await,
        }
    }
}

const EXPO_PUSH_URL: &str = "https://exp.host/--/api/v2/push/send";
/// Expo Push API의 요청당 메시지 상한.
const EXPO_BATCH_SIZE: usize = 100;

#[derive(Deserialize)]
struct ExpoResponse {
    data: Vec<ExpoTicket>,
}

#[derive(Deserialize)]
struct ExpoTicket {
    status: String,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    details: Option<ExpoTicketDetails>,
}

#[derive(Deserialize)]
struct ExpoTicketDetails {
    #[serde(default)]
    error: Option<String>,
}

async fn send_expo(http: &reqwest::Client, messages: &[PushMessage]) -> Vec<SendOutcome> {
    let mut outcomes = Vec::with_capacity(messages.len());

    // Expo API는 Expo 토큰만 받는다 — 다른 플랫폼 토큰은 일시 실패로 분류해
    // 재시도 상한까지 살아 있게 둔다 (fcm/apns 직결 발송기가 붙으면 처리될 자리).
    let expo_messages: Vec<&PushMessage> =
        messages.iter().filter(|m| m.platform == "expo").collect();
    for skipped in messages.iter().filter(|m| m.platform != "expo") {
        tracing::warn!(platform = %skipped.platform, "expo 발송기가 지원하지 않는 플랫폼 — 실패 처리");
        outcomes.push(SendOutcome {
            token: skipped.token.clone(),
            status: SendStatus::Failed,
        });
    }

    for batch in expo_messages.chunks(EXPO_BATCH_SIZE) {
        outcomes.extend(send_expo_batch(http, batch).await);
    }
    outcomes
}

async fn send_expo_batch(http: &reqwest::Client, batch: &[&PushMessage]) -> Vec<SendOutcome> {
    let all_failed = || {
        batch
            .iter()
            .map(|msg| SendOutcome {
                token: msg.token.clone(),
                status: SendStatus::Failed,
            })
            .collect::<Vec<_>>()
    };

    let payload: Vec<serde_json::Value> = batch
        .iter()
        .map(|msg| {
            json!({
                "to": msg.token,
                "title": msg.title,
                "body": msg.body,
                "data": { "taskId": msg.task_id },
            })
        })
        .collect();

    let response = match http.post(EXPO_PUSH_URL).json(&payload).send().await {
        Ok(res) => res,
        Err(err) => {
            tracing::error!(error = %err, "Expo 푸시 요청 실패");
            return all_failed();
        }
    };
    if !response.status().is_success() {
        tracing::error!(status = %response.status(), "Expo 푸시 응답 오류");
        return all_failed();
    }
    match response.json::<ExpoResponse>().await {
        Ok(body) => expo_outcomes(&body.data, batch),
        Err(err) => {
            tracing::error!(error = %err, "Expo 응답 파싱 실패");
            all_failed()
        }
    }
}

/// 티켓은 요청 배열과 같은 순서로 온다. DeviceNotRegistered(앱 삭제)만
/// 죽은 토큰으로 분류 — 나머지 오류는 일시 실패로 보고 재시도에 맡긴다.
fn expo_outcomes(tickets: &[ExpoTicket], batch: &[&PushMessage]) -> Vec<SendOutcome> {
    batch
        .iter()
        .enumerate()
        .map(|(i, msg)| {
            let status = match tickets.get(i) {
                Some(ticket) if ticket.status == "ok" => SendStatus::Sent,
                Some(ticket) => {
                    let error = ticket.details.as_ref().and_then(|d| d.error.as_deref());
                    tracing::error!(token = %msg.token, error = ?error, message = ?ticket.message, "Expo 티켓 오류");
                    if error == Some("DeviceNotRegistered") {
                        SendStatus::DeadToken
                    } else {
                        SendStatus::Failed
                    }
                }
                None => SendStatus::Failed, // 티켓 수 불일치 — 방어적으로 실패 처리
            };
            SendOutcome {
                token: msg.token.clone(),
                status,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn task() -> DueTask {
        DueTask {
            id: "task-1".to_string(),
            user_id: "user-1".to_string(),
            title: "주간 회의 준비".to_string(),
            date: "2026-07-10".to_string(),
            start_at: "14:30".to_string(),
        }
    }

    #[test]
    fn 메시지는_태스크_제목과_예정_시각을_담는다() {
        let targets = vec![
            PushTarget {
                token: "tok-a".to_string(),
                platform: "expo".to_string(),
            },
            PushTarget {
                token: "tok-b".to_string(),
                platform: "fcm".to_string(),
            },
        ];

        let messages = build_messages(&task(), &targets);

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].token, "tok-a");
        assert_eq!(messages[0].title, "주간 회의 준비");
        assert!(messages[0].body.contains("14:30"));
        assert_eq!(messages[0].task_id, "task-1");
        assert_eq!(messages[1].platform, "fcm");
    }

    #[test]
    fn expo_티켓을_토큰별_결과로_매핑한다() {
        let tickets: Vec<ExpoTicket> = serde_json::from_str(
            r#"[
              {"status": "ok", "id": "t1"},
              {"status": "error", "message": "not registered", "details": {"error": "DeviceNotRegistered"}},
              {"status": "error", "message": "overloaded", "details": {"error": "MessageRateExceeded"}}
            ]"#,
        )
        .expect("티켓 파싱");
        let targets: Vec<PushTarget> = ["a", "b", "c"]
            .iter()
            .map(|t| PushTarget {
                token: (*t).to_string(),
                platform: "expo".to_string(),
            })
            .collect();
        let messages = build_messages(&task(), &targets);
        let refs: Vec<&PushMessage> = messages.iter().collect();

        let outcomes = expo_outcomes(&tickets, &refs);

        assert_eq!(outcomes[0].status, SendStatus::Sent);
        assert_eq!(outcomes[1].status, SendStatus::DeadToken);
        assert_eq!(outcomes[2].status, SendStatus::Failed);
    }

    #[test]
    fn 티켓_수가_모자라면_실패로_방어한다() {
        let tickets: Vec<ExpoTicket> =
            serde_json::from_str(r#"[{"status": "ok"}]"#).expect("티켓 파싱");
        let targets = vec![
            PushTarget {
                token: "a".to_string(),
                platform: "expo".to_string(),
            },
            PushTarget {
                token: "b".to_string(),
                platform: "expo".to_string(),
            },
        ];
        let messages = build_messages(&task(), &targets);
        let refs: Vec<&PushMessage> = messages.iter().collect();

        let outcomes = expo_outcomes(&tickets, &refs);

        assert_eq!(outcomes[0].status, SendStatus::Sent);
        assert_eq!(outcomes[1].status, SendStatus::Failed);
    }
}
