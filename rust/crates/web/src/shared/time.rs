use chrono::{Datelike, NaiveDate, Weekday};

use crate::shared::i18n::{Locale, Messages};

const DAY_MIN: i64 = 24 * 60;

/// locale별 표시 패턴. locale마다 필드 순서가 달라 패턴을 여기서 지정한다.
/// TS는 date-fns 패턴 문자열을 뒀지만, 여기서는 같은 출력을 내는 조립 규칙을 직접 든다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WeekdayStyle {
    /// '5월 2일 토요일'
    Long,
    /// '5월 2일 (토)'
    Short,
}

/// 한국어 요일 — 약칭과 전체명. 인덱스는 월요일 시작(chrono `Weekday`)이다.
const KO_WEEKDAYS: [(&str, &str); 7] = [
    ("월", "월요일"),
    ("화", "화요일"),
    ("수", "수요일"),
    ("목", "목요일"),
    ("금", "금요일"),
    ("토", "토요일"),
    ("일", "일요일"),
];

fn ko_weekday(weekday: Weekday) -> (&'static str, &'static str) {
    KO_WEEKDAYS[weekday.num_days_from_monday() as usize]
}

/// 로컬 기준 'YYYY-MM-DD' — 서버 계약(`Task::date`)과 같은 표현.
/// 문자열 비교가 곧 날짜 비교다.
pub fn to_iso_date(date: NaiveDate) -> String {
    format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day())
}

/// 서버 계약('YYYY-MM-DD')을 로컬 날짜로 파싱 — [`to_iso_date`]의 역.
pub fn parse_iso_date(iso: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(iso, "%Y-%m-%d").ok()
}

/// 표시용 날짜 라벨 — locale에 맞춰 '5월 2일 토요일'(long) / '5월 2일 (토)'(short)
pub fn format_date_label(locale: Locale, date: NaiveDate, style: WeekdayStyle) -> String {
    match locale {
        Locale::Ko => {
            let (short, long) = ko_weekday(date.weekday());
            match style {
                WeekdayStyle::Long => format!("{}월 {}일 {long}", date.month(), date.day()),
                // short의 괄호는 Intl ko가 날짜 문맥의 약칭 요일을 '(일)'로 내던 표기와 파리티를 맞춘 것.
                WeekdayStyle::Short => format!("{}월 {}일 ({short})", date.month(), date.day()),
            }
        }
    }
}

/// 요일 약칭 — locale에 맞춰 '토'
pub fn format_weekday(locale: Locale, date: NaiveDate) -> String {
    match locale {
        Locale::Ko => ko_weekday(date.weekday()).0.to_owned(),
    }
}

/// 'HH:mm' → 자정 기준 분
pub fn time_to_min(time: &str) -> i64 {
    let Some((hour, minute)) = time.split_once(':') else { return 0 };
    let hour: i64 = hour.parse().unwrap_or(0);
    let minute: i64 = minute.parse().unwrap_or(0);
    hour * 60 + minute
}

/// 분 → 'HH:mm' — 하루(0–24시) 안으로 클램프한다
pub fn min_to_time(total: i64) -> String {
    let clamped = total.clamp(0, DAY_MIN);
    // 24:00은 유효한 시각으로 표현 불가(자정으로 롤오버)하니 하루 끝 경계만 별도 표기한다.
    if clamped == DAY_MIN {
        return "24:00".to_owned();
    }
    format!("{:02}:{:02}", clamped / 60, clamped % 60)
}

/// 시작 시각 + 기간(분) → 종료 시각 'HH:mm' — 클램프·경계는 [`min_to_time`]에 위임
pub fn end_time(start_at: &str, duration_min: i64) -> String {
    min_to_time(time_to_min(start_at) + duration_min)
}

/// 기간(분)을 로컬 문구로 — '30분' / '2시간' / '1시간 30분'
pub fn format_duration(t: &Messages, duration_min: i64) -> String {
    if duration_min < 60 {
        return t.common.duration.minutes.format(duration_min);
    }
    let hour = duration_min / 60;
    let min = duration_min % 60;
    if min == 0 {
        t.common.duration.hours.format(hour)
    } else {
        t.common.duration.hours_minutes.format(hour, min)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(year: i32, month: u32, day: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(year, month, day).expect("유효한 날짜")
    }

    /// 2026-05-02는 토요일 — locale 표시 파리티 고정용 기준일
    fn saturday() -> NaiveDate {
        date(2026, 5, 2)
    }

    #[test]
    fn to_iso_date는_로컬_기준_yyyy_mm_dd로_포맷한다() {
        assert_eq!(to_iso_date(saturday()), "2026-05-02");
        assert_eq!(to_iso_date(date(2026, 1, 9)), "2026-01-09");
    }

    #[test]
    fn parse_iso_date는_iso_날짜_문자열을_파싱한다() {
        let parsed = parse_iso_date("2026-05-02").expect("파싱");
        assert_eq!(parsed.year(), 2026);
        assert_eq!(parsed.month(), 5);
        assert_eq!(parsed.day(), 2);
    }

    #[test]
    fn 왕복이_보존된다() {
        assert_eq!(to_iso_date(parse_iso_date("2026-12-25").expect("파싱")), "2026-12-25");
    }

    #[test]
    fn format_date_label_long은_요일_전체명이다() {
        assert_eq!(format_date_label(Locale::Ko, saturday(), WeekdayStyle::Long), "5월 2일 토요일");
    }

    #[test]
    fn format_date_label_short는_괄호_약칭_요일이다() {
        assert_eq!(format_date_label(Locale::Ko, saturday(), WeekdayStyle::Short), "5월 2일 (토)");
    }

    #[test]
    fn format_weekday는_요일_약칭을_낸다() {
        assert_eq!(format_weekday(Locale::Ko, saturday()), "토");
        assert_eq!(format_weekday(Locale::Ko, date(2026, 5, 3)), "일");
        assert_eq!(format_weekday(Locale::Ko, date(2026, 5, 4)), "월");
    }

    #[test]
    fn time_to_min은_hh_mm을_자정_기준_분으로_변환한다() {
        assert_eq!(time_to_min("00:00"), 0);
        assert_eq!(time_to_min("09:00"), 540);
        assert_eq!(time_to_min("09:30"), 570);
        assert_eq!(time_to_min("23:59"), 1439);
    }

    #[test]
    fn min_to_time은_분을_hh_mm으로_포맷한다() {
        assert_eq!(min_to_time(0), "00:00");
        assert_eq!(min_to_time(540), "09:00");
        assert_eq!(min_to_time(570), "09:30");
        assert_eq!(min_to_time(1439), "23:59");
    }

    #[test]
    fn min_to_time은_하루_범위_밖을_클램프한다() {
        assert_eq!(min_to_time(-30), "00:00");
        assert_eq!(min_to_time(24 * 60), "24:00");
        assert_eq!(min_to_time(24 * 60 + 30), "24:00");
    }

    #[test]
    fn end_time은_시작_시각과_기간을_더한다() {
        assert_eq!(end_time("09:00", 30), "09:30");
        assert_eq!(end_time("09:00", 90), "10:30");
    }

    #[test]
    fn end_time은_하루_끝을_넘으면_24_00으로_클램프한다() {
        assert_eq!(end_time("23:30", 60), "24:00");
        assert_eq!(end_time("23:00", 90), "24:00");
    }

    #[test]
    fn format_duration은_분_시간_시간분을_구분한다() {
        let t = crate::shared::i18n::ko::messages();
        assert_eq!(format_duration(&t, 30), "30분");
        assert_eq!(format_duration(&t, 120), "2시간");
        assert_eq!(format_duration(&t, 90), "1시간 30분");
    }
}
