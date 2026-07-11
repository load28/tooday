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
    /// HTTP 서버(healthz/readyz/metrics + subscriptions) 바인드 주소.
    pub http_addr: SocketAddr,
    /// BFF와 공유하는 액세스 JWT 서명 시크릿(BFF_JWT_SECRET와 같은 값).
    /// 미설정이면 /subscriptions만 503 — 운영 표면과 스케줄러는 동작한다.
    pub jwt_secret: Option<String>,
    /// DB 커넥션 풀 크기 — 스케줄러 팬아웃 + HTTP 핸들러가 나눠 쓴다.
    pub db_pool_size: usize,
    /// 틱 안에서 동시에 처리할 발송 수.
    pub fanout_concurrency: usize,
    /// 전달 재시도 상한 — 도달하면 발송을 포기(failed)한다.
    pub max_attempts: i32,
    /// 발송 점유(lease) 시간(초) — 이 시간 안에 확정 못 하면(크래시 등)
    /// 복구 경로가 이어받는다. 정상 발송 소요보다 넉넉해야 이중 발송이 없다.
    pub lease_secs: u64,
    /// 재시도 백오프 기본값(초) — base × 2^attempts, 상한 15분.
    pub retry_base_secs: u64,
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

        let db_pool_size: usize = env_or("PUSH_DB_POOL_SIZE", 8)?;
        let fanout_concurrency: usize = env_or("PUSH_FANOUT_CONCURRENCY", 16)?;
        let max_attempts: i32 = env_or("PUSH_MAX_ATTEMPTS", 5)?;
        let lease_secs: u64 = env_or("PUSH_LEASE_SECS", 60)?;
        let retry_base_secs: u64 = env_or("PUSH_RETRY_BASE_SECS", 30)?;
        for (name, value) in [
            ("PUSH_DB_POOL_SIZE", db_pool_size as i64),
            ("PUSH_FANOUT_CONCURRENCY", fanout_concurrency as i64),
            ("PUSH_MAX_ATTEMPTS", max_attempts as i64),
            ("PUSH_LEASE_SECS", lease_secs as i64),
            ("PUSH_RETRY_BASE_SECS", retry_base_secs as i64),
        ] {
            if value < 1 {
                bail!("{name}는 1 이상이어야 합니다");
            }
        }

        Ok(Self {
            database_url,
            poll_interval: Duration::from_secs(poll_secs),
            lookback_min,
            timezone,
            sender,
            http_addr,
            jwt_secret,
            db_pool_size,
            fanout_concurrency,
            max_attempts,
            lease_secs,
            retry_base_secs,
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
