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

    /// 성공적으로 발송한 메시지 수를 돌려준다. 실패는 로그로만 남긴다 —
    /// 재시도 여부(점유 해제)는 호출부(scheduler)가 결정한다.
    pub async fn send(&self, messages: &[PushMessage]) -> usize {
        match self {
            Sender::Log => {
                for msg in messages {
                    tracing::info!(
                        token = %msg.token,
                        platform = %msg.platform,
                        title = %msg.title,
                        body = %msg.body,
                        task_id = %msg.task_id,
                        "푸시 발송 (log 발송기 — 실제 발송 없음)"
                    );
                }
                messages.len()
            }
            Sender::Expo { http } => send_expo(http, messages).await,
        }
    }
}

const EXPO_PUSH_URL: &str = "https://exp.host/--/api/v2/push/send";

#[derive(Deserialize)]
struct ExpoResponse {
    data: Vec<ExpoTicket>,
}

#[derive(Deserialize)]
struct ExpoTicket {
    status: String,
    #[serde(default)]
    message: Option<String>,
}

async fn send_expo(http: &reqwest::Client, messages: &[PushMessage]) -> usize {
    // Expo API는 Expo 토큰만 받는다 — 다른 플랫폼 토큰은 걸러내고 경고만 남긴다.
    let expo_messages: Vec<&PushMessage> =
        messages.iter().filter(|m| m.platform == "expo").collect();
    for skipped in messages.iter().filter(|m| m.platform != "expo") {
        tracing::warn!(platform = %skipped.platform, "expo 발송기가 지원하지 않는 플랫폼 — 건너뜀");
    }
    if expo_messages.is_empty() {
        return 0;
    }

    let payload: Vec<serde_json::Value> = expo_messages
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
            return 0;
        }
    };
    if !response.status().is_success() {
        tracing::error!(status = %response.status(), "Expo 푸시 응답 오류");
        return 0;
    }

    // 티켓은 요청 배열과 같은 순서로 온다.
    match response.json::<ExpoResponse>().await {
        Ok(body) => {
            let mut sent = 0;
            for (ticket, msg) in body.data.iter().zip(expo_messages.iter()) {
                if ticket.status == "ok" {
                    sent += 1;
                } else {
                    tracing::error!(token = %msg.token, error = ?ticket.message, "Expo 티켓 오류");
                }
            }
            sent
        }
        Err(err) => {
            tracing::error!(error = %err, "Expo 응답 파싱 실패");
            0
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 메시지는_태스크_제목과_예정_시각을_담는다() {
        let task = DueTask {
            id: "task-1".to_string(),
            user_id: "user-1".to_string(),
            title: "주간 회의 준비".to_string(),
            date: "2026-07-10".to_string(),
            start_at: "14:30".to_string(),
        };
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

        let messages = build_messages(&task, &targets);

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].token, "tok-a");
        assert_eq!(messages[0].title, "주간 회의 준비");
        assert!(messages[0].body.contains("14:30"));
        assert_eq!(messages[0].task_id, "task-1");
        assert_eq!(messages[1].platform, "fcm");
    }
}
