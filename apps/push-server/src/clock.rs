use chrono::{DateTime, Duration, TimeZone, Utc};
use chrono_tz::Tz;

/// due 창 `[from, to]` — `'YYYY-MM-DD HH:mm'` 문자열 쌍.
///
/// tasks의 `date || ' ' || start_at`과 같은 포맷이라 사전순 비교가 곧 시각
/// 비교다. 창이 자정을 걸치면 날짜 부분이 자연히 넘어가므로 별도 분기가 없다.
pub fn due_window(now: DateTime<Utc>, tz: Tz, lookback_min: i64) -> (String, String) {
    let now_local = now.with_timezone(&tz);
    let from = now_local - Duration::minutes(lookback_min);
    (format_minute(&from), format_minute(&now_local))
}

fn format_minute<T: TimeZone>(dt: &DateTime<T>) -> String
where
    T::Offset: std::fmt::Display,
{
    dt.format("%Y-%m-%d %H:%M").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono_tz::Asia::Seoul;

    fn utc(s: &str) -> DateTime<Utc> {
        s.parse().expect("테스트 시각 파싱")
    }

    #[test]
    fn utc를_설정_시간대_로컬_문자열로_바꾼다() {
        // 03:00 UTC = 12:00 KST(+09:00)
        let (from, to) = due_window(utc("2026-07-10T03:00:00Z"), Seoul, 10);
        assert_eq!(from, "2026-07-10 11:50");
        assert_eq!(to, "2026-07-10 12:00");
    }

    #[test]
    fn 자정을_걸치면_창의_시작이_전날로_넘어간다() {
        // 15:05 UTC = 다음날 00:05 KST
        let (from, to) = due_window(utc("2026-07-09T15:05:00Z"), Seoul, 10);
        assert_eq!(from, "2026-07-09 23:55");
        assert_eq!(to, "2026-07-10 00:05");
    }

    #[test]
    fn 창_경계는_태스크_일시_문자열과_사전순_비교가_가능하다() {
        let (from, to) = due_window(utc("2026-07-10T03:00:00Z"), Seoul, 10);
        let task_datetime = "2026-07-10 11:55"; // date || ' ' || start_at
        assert!(from.as_str() <= task_datetime && task_datetime <= to.as_str());
    }
}
