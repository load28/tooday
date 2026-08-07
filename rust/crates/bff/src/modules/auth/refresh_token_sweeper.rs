use std::sync::Arc;
use std::time::Duration;

use crate::modules::auth::ports::RefreshTokenStore;
use crate::platform::logging::Logger;

const DEFAULT_SWEEP_INTERVAL: Duration = Duration::from_secs(60 * 60);

/// 만료(idle/absolute) 리프레시 토큰을 주기적으로 청소한다(부팅 시 1회 + 인터벌).
/// 조회 경로에 안 걸리는 만료 행이 저장소에 누적되지 않게 한다. `delete_expired` 포트만
/// 쓰므로 어떤 어댑터에도 무관하다 — 필요 여부는 호출부(needs_expiry_sweep)가 판단한다.
/// 인터벌을 멈추는 핸들을 반환한다.
pub async fn start_refresh_token_sweep(
    store: Arc<dyn RefreshTokenStore>,
    logger: Logger,
    interval: Option<Duration>,
) -> tokio::task::JoinHandle<()> {
    sweep_once(store.as_ref(), logger.as_ref()).await;

    let period = interval.unwrap_or(DEFAULT_SWEEP_INTERVAL);
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(period);
        ticker.tick().await; // 첫 tick은 즉시 발화하므로 버린다 (부팅 스윕이 이미 돌았다)
        loop {
            ticker.tick().await;
            sweep_once(store.as_ref(), logger.as_ref()).await;
        }
    })
}

async fn sweep_once(store: &dyn RefreshTokenStore, logger: &dyn crate::platform::logging::Log) {
    match store.delete_expired().await {
        Ok(deleted) if deleted > 0 => {
            logger.info("refresh_tokens_swept", vec![("deleted", deleted.into())]);
        }
        Ok(_) => {}
        Err(error) => {
            logger.error("refresh_token_sweep_failed", vec![("message", error.to_string().into())]);
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use async_trait::async_trait;

    use super::*;
    use crate::modules::auth::ports::RefreshToken;
    use crate::platform::errors::{StoreError, StoreResult};
    use crate::platform::logging::{Fields, Log, LogLevel};

    #[derive(Debug, PartialEq, Eq)]
    struct LogCall {
        level: LogLevel,
        message: String,
        fields: Vec<(String, String)>,
    }

    #[derive(Default)]
    struct FakeLogger {
        calls: Mutex<Vec<LogCall>>,
    }

    impl Log for FakeLogger {
        fn log(&self, level: LogLevel, message: &str, fields: Fields) {
            self.calls.lock().expect("logger mutex").push(LogCall {
                level,
                message: message.to_owned(),
                fields: fields
                    .into_iter()
                    .map(|(key, value)| (key.to_owned(), value.to_string()))
                    .collect(),
            });
        }
    }

    /// delete_expired만 의미 있게 채운 스텁 — 스윕은 이 포트 하나만 쓴다.
    struct FakeStore {
        outcome: fn() -> StoreResult<u64>,
        calls: Mutex<usize>,
    }

    #[async_trait]
    impl RefreshTokenStore for FakeStore {
        async fn issue(&self, _user_id: &str) -> StoreResult<RefreshToken> {
            unreachable!("스윕은 issue를 쓰지 않는다")
        }
        async fn rotate(&self, _token: &str) -> StoreResult<Option<RefreshToken>> {
            Ok(None)
        }
        async fn revoke(&self, _token: &str) -> StoreResult<()> {
            Ok(())
        }
        async fn is_session_live(&self, _session_id: &str) -> StoreResult<bool> {
            Ok(false)
        }
        async fn delete_expired(&self) -> StoreResult<u64> {
            *self.calls.lock().expect("calls mutex") += 1;
            (self.outcome)()
        }
    }

    fn setup(outcome: fn() -> StoreResult<u64>) -> (Arc<FakeStore>, Arc<FakeLogger>) {
        (Arc::new(FakeStore { outcome, calls: Mutex::new(0) }), Arc::new(FakeLogger::default()))
    }

    // 인터벌은 크게 둬 테스트 중 발화하지 않게 하고, 반환된 핸들로 타이머를 즉시 정리한다.
    const INTERVAL: Duration = Duration::from_secs(60);

    #[tokio::test]
    async fn 부팅_시_즉시_1회_청소하고_지운_게_있으면_로그를_남긴다() {
        let (store, logger) = setup(|| Ok(3));
        let handle = start_refresh_token_sweep(
            Arc::clone(&store) as Arc<_>,
            Arc::clone(&logger) as Arc<_>,
            Some(INTERVAL),
        )
        .await;
        handle.abort();

        assert_eq!(*store.calls.lock().expect("calls mutex"), 1);
        assert_eq!(
            logger.calls.lock().expect("logger mutex").as_slice(),
            [LogCall {
                level: LogLevel::Info,
                message: "refresh_tokens_swept".into(),
                fields: vec![("deleted".into(), "3".into())],
            }]
        );
    }

    #[tokio::test]
    async fn 지운_게_없으면_로그를_남기지_않는다() {
        let (store, logger) = setup(|| Ok(0));
        let handle = start_refresh_token_sweep(
            store as Arc<_>,
            Arc::clone(&logger) as Arc<_>,
            Some(INTERVAL),
        )
        .await;
        handle.abort();

        assert!(logger.calls.lock().expect("logger mutex").is_empty());
    }

    #[tokio::test]
    async fn delete_expired가_실패해도_삼키고_error_로그를_남긴다() {
        let (store, logger) = setup(|| Err(StoreError::Infrastructure("boom".into())));
        let handle = start_refresh_token_sweep(
            store as Arc<_>,
            Arc::clone(&logger) as Arc<_>,
            Some(INTERVAL),
        )
        .await;
        handle.abort();

        let calls = logger.calls.lock().expect("logger mutex");
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].level, LogLevel::Error);
        assert_eq!(calls[0].message, "refresh_token_sweep_failed");
        assert!(calls[0].fields[0].1.contains("boom"));
    }
}
