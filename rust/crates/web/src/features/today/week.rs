use chrono::{Datelike, Duration, NaiveDate};

use crate::shared::i18n::Locale;
use crate::shared::time::{format_date_label, format_weekday, to_iso_date, WeekdayStyle};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DayCell {
    /// ISO 날짜 문자열 — 리스트 key 용
    pub key: String,
    /// 오늘 기준 오프셋(일). 조회와 선택 상태의 기준.
    pub offset: i64,
    /// 요일 한 글자 (예: '토')
    pub dow: String,
    /// 일(day of month) 숫자
    pub day: u32,
    pub is_today: bool,
    /// 히어로에 쓰는 전체 날짜 라벨 (예: '5월 3일 토요일')
    pub label: String,
}

/// 가이드와 동일하게 오늘이 3번째 칸에 오도록 오늘-2일부터 7일 창을 만든다
pub const WEEK_START_OFFSET: i64 = -2;
pub const WEEK_LENGTH: i64 = 7;
pub const TODAY_INDEX: i64 = -WEEK_START_OFFSET;

fn date_at_offset(now: NaiveDate, offset: i64) -> NaiveDate {
    now + Duration::days(offset)
}

/// 주간 창의 양 끝 날짜 — `task.range` 쿼리 입력. 가드와 화면이 같은 값을 계산한다.
pub fn week_range(now: NaiveDate) -> tooday_shared::TaskRangeRequest {
    tooday_shared::TaskRangeRequest {
        from: to_iso_date(date_at_offset(now, WEEK_START_OFFSET)),
        to: to_iso_date(date_at_offset(now, WEEK_START_OFFSET + WEEK_LENGTH - 1)),
    }
}

pub fn build_week(now: NaiveDate, locale: Locale) -> Vec<DayCell> {
    (0..WEEK_LENGTH)
        .map(|index| {
            let offset = WEEK_START_OFFSET + index;
            let date = date_at_offset(now, offset);
            DayCell {
                key: to_iso_date(date),
                offset,
                dow: format_weekday(locale, date),
                day: date.day(),
                is_today: offset == 0,
                label: format_date_label(locale, date, WeekdayStyle::Long),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn saturday() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 5, 2).expect("유효한 날짜")
    }

    #[test]
    fn 주간_창은_오늘_2일_전부터_7일이다() {
        let range = week_range(saturday());
        assert_eq!(range.from, "2026-04-30");
        assert_eq!(range.to, "2026-05-06");
    }

    #[test]
    fn 오늘이_세_번째_칸이다() {
        let week = build_week(saturday(), Locale::Ko);
        assert_eq!(week.len(), WEEK_LENGTH as usize);
        assert_eq!(week[TODAY_INDEX as usize].offset, 0);
        assert!(week[TODAY_INDEX as usize].is_today);
        assert_eq!(week.iter().filter(|cell| cell.is_today).count(), 1);
    }

    #[test]
    fn 각_칸은_날짜_요일_라벨을_갖는다() {
        let week = build_week(saturday(), Locale::Ko);
        let today = &week[TODAY_INDEX as usize];
        assert_eq!(today.key, "2026-05-02");
        assert_eq!(today.day, 2);
        assert_eq!(today.dow, "토");
        assert_eq!(today.label, "5월 2일 토요일");
    }

    #[test]
    fn 창의_양_끝이_week_range와_일치한다() {
        let week = build_week(saturday(), Locale::Ko);
        let range = week_range(saturday());
        assert_eq!(week.first().expect("첫 칸").key, range.from);
        assert_eq!(week.last().expect("마지막 칸").key, range.to);
    }
}
