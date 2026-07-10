use std::net::SocketAddr;
use std::str::FromStr;
use std::time::Duration;

use anyhow::{bail, Context};
use chrono_tz::Tz;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SenderKind {
    /// 발송 내용을 로그로만 남긴다 — 개발·검증용 기본값.
    Log,
    /// Expo Push API — RN(Expo) 기기 토큰 대상. 별도 인증정보 불필요.
    Expo,
}

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub poll_interval: Duration,
    /// due 창의 과거 한도(분) — 서버가 이만큼 죽어 있어도 밀린 알림을 복구한다.
    pub lookback_min: i64,
    /// tasks.date/start_at은 시간대 없는 로컬 값이라 이 시간대로 해석한다.
    /// 유저별 시간대는 후속 과제 (docs/tasks/T025-rust-push-server.md).
    pub timezone: Tz,
    pub sender: SenderKind,
    /// 구독 등록/해제 HTTP API 바인드 주소.
    pub http_addr: SocketAddr,
    /// BFF와 공유하는 액세스 JWT 서명 시크릿(BFF_JWT_SECRET와 같은 값).
    /// 미설정이면 HTTP API를 끈 채 스케줄러만 돈다.
    pub jwt_secret: Option<String>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL").context("DATABASE_URL이 필요합니다")?;

        let poll_secs: u64 = env_or("PUSH_POLL_INTERVAL_SECS", 30)?;
        if poll_secs == 0 {
            bail!("PUSH_POLL_INTERVAL_SECS는 1 이상이어야 합니다");
        }

        let lookback_min: i64 = env_or("PUSH_LOOKBACK_MIN", 10)?;
        if lookback_min < 1 {
            bail!("PUSH_LOOKBACK_MIN은 1 이상이어야 합니다");
        }

        let tz_name = std::env::var("PUSH_TIMEZONE").unwrap_or_else(|_| "Asia/Seoul".to_string());
        let timezone: Tz = tz_name
            .parse()
            .map_err(|err| anyhow::anyhow!("PUSH_TIMEZONE '{tz_name}' 해석 실패: {err}"))?;

        let sender_name = std::env::var("PUSH_SENDER").unwrap_or_else(|_| "log".to_string());
        let sender = match sender_name.as_str() {
            "log" => SenderKind::Log,
            "expo" => SenderKind::Expo,
            other => bail!("PUSH_SENDER는 log | expo 중 하나여야 합니다 (받은 값: '{other}')"),
        };

        let http_addr: SocketAddr = env_or("PUSH_HTTP_ADDR", "127.0.0.1:3003".parse()?)?;
        let jwt_secret = std::env::var("PUSH_JWT_SECRET")
            .ok()
            .filter(|s| !s.is_empty());

        Ok(Self {
            database_url,
            poll_interval: Duration::from_secs(poll_secs),
            lookback_min,
            timezone,
            sender,
            http_addr,
            jwt_secret,
        })
    }
}

fn env_or<T: FromStr>(name: &str, default: T) -> anyhow::Result<T>
where
    T::Err: std::fmt::Display,
{
    match std::env::var(name) {
        Err(_) => Ok(default),
        Ok(raw) => raw
            .parse()
            .map_err(|err| anyhow::anyhow!("{name} '{raw}' 해석 실패: {err}")),
    }
}
