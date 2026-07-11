/// 재시도 백오프 상한 — 이보다 늦게 보낼 바에는 알림 가치가 없다.
const MAX_BACKOFF_SECS: u64 = 900;

/// 지수 백오프: base × 2^attempts, 상한 15분.
/// attempts는 "이미 실패한 횟수" — 첫 재시도(attempts=0 이후)는 base 그대로.
pub fn backoff_secs(base: u64, attempts: i32) -> u64 {
    let shift = attempts.clamp(0, 20) as u32;
    base.saturating_mul(1u64 << shift).min(MAX_BACKOFF_SECS)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 실패_횟수마다_두_배로_늘어난다() {
        assert_eq!(backoff_secs(30, 0), 30);
        assert_eq!(backoff_secs(30, 1), 60);
        assert_eq!(backoff_secs(30, 2), 120);
        assert_eq!(backoff_secs(30, 3), 240);
    }

    #[test]
    fn 상한_15분을_넘지_않는다() {
        assert_eq!(backoff_secs(30, 5), 900);
        assert_eq!(backoff_secs(30, 100), 900); // 시프트 오버플로 없이 상한 고정
    }
}
