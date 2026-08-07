//! valibot 대응 검증 계층.
//!
//! 스키마는 검증 규칙(계약)만 정의한다. 사용자향 문구는 각 화면이 발생 가능한
//! issue 타입으로 매핑해 소유한다 — TS의 `v.InferIssue`가 하던 역할을
//! [`IssueKind`]가 대신한다. 화면이 분기하는 키(`min_length`, `email` …)가 계약이므로
//! 이름을 바꾸면 웹의 문구 매핑이 함께 깨져야 한다.

use serde::Serialize;
use std::fmt;

/// valibot issue의 `type` 필드와 1:1. 웹 폼이 이 키로 문구를 고른다.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum IssueKind {
    String,
    MinLength,
    Email,
    IsoDate,
    IsoTime,
    Integer,
    MinValue,
    Picklist,
    /// `v.check(...)` — 스키마 수준의 임의 술어
    Check,
}

impl IssueKind {
    /// 직렬화 이름 — valibot의 issue.type과 같은 문자열
    pub fn as_str(self) -> &'static str {
        match self {
            IssueKind::String => "string",
            IssueKind::MinLength => "min_length",
            IssueKind::Email => "email",
            IssueKind::IsoDate => "iso_date",
            IssueKind::IsoTime => "iso_time",
            IssueKind::Integer => "integer",
            IssueKind::MinValue => "min_value",
            IssueKind::Picklist => "picklist",
            IssueKind::Check => "check",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Issue {
    #[serde(rename = "type")]
    pub kind: IssueKind,
    /// 필드 경로 — 중첩 객체는 `["patch", "title"]`처럼 쌓인다
    pub path: Vec<String>,
    pub message: String,
}

impl Issue {
    pub fn new(kind: IssueKind, field: &str, message: impl Into<String>) -> Self {
        let path = if field.is_empty() {
            Vec::new()
        } else {
            field.split('.').map(str::to_owned).collect()
        };
        Self { kind, path, message: message.into() }
    }
}

impl fmt::Display for Issue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.path.is_empty() {
            write!(f, "{}", self.message)
        } else {
            write!(f, "{}: {}", self.path.join("."), self.message)
        }
    }
}

/// 검증 실패 묶음 — 전송 계층이 400으로 매핑한다.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ValidationError(pub Vec<Issue>);

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let rendered: Vec<String> = self.0.iter().map(ToString::to_string).collect();
        write!(f, "{}", rendered.join(", "))
    }
}

impl std::error::Error for ValidationError {}

impl ValidationError {
    pub fn issues(&self) -> &[Issue] {
        &self.0
    }
}

/// 검증 규칙을 모으는 수집기. 첫 실패에서 멈추지 않고 전부 모은다.
#[derive(Debug, Default)]
pub struct Issues(Vec<Issue>);

impl Issues {
    pub fn new() -> Self {
        Self(Vec::new())
    }

    pub fn push(&mut self, kind: IssueKind, field: &str, message: impl Into<String>) {
        self.0.push(Issue::new(kind, field, message));
    }

    /// 이미 만들어진 issue를 그대로 넣는다 — 중첩 스키마가 경로를 접두사와 합칠 때 쓴다.
    pub fn push_raw(&mut self, issue: Issue) {
        self.0.push(issue);
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    pub fn into_vec(self) -> Vec<Issue> {
        self.0
    }

    pub fn into_result(self) -> Result<(), ValidationError> {
        if self.0.is_empty() {
            Ok(())
        } else {
            Err(ValidationError(self.0))
        }
    }
}

/// 스키마 하나에 대응하는 계약. `parse`는 valibot처럼 변환(trim)을 적용한 뒤 검증한다.
pub trait Validate {
    /// 트림 등 파이프라인 변환. 검증 전에 호출된다.
    fn normalize(&mut self) {}
    fn collect_issues(&self, issues: &mut Issues);

    /// valibot `v.parse` 대응 — 변환 + 검증. 실패하면 issue 전량을 돌려준다.
    fn parse(mut self) -> Result<Self, ValidationError>
    where
        Self: Sized,
    {
        self.normalize();
        let mut issues = Issues::new();
        self.collect_issues(&mut issues);
        issues.into_result()?;
        Ok(self)
    }
}

// --- 개별 검증 규칙 (valibot의 파이프 액션 대응) -----------------------------

/// `v.minLength(n)` — 문자 수(코드포인트) 기준. JS의 `.length`는 UTF-16 단위지만
/// 여기 쓰이는 하한(1, 8)에서는 어느 단위로도 판정이 같다.
pub fn min_length(issues: &mut Issues, field: &str, value: &str, min: usize) {
    if value.chars().count() < min {
        issues.push(
            IssueKind::MinLength,
            field,
            format!("Invalid length: Expected >={min} but received {}", value.chars().count()),
        );
    }
}

/// `v.email()` — valibot의 이메일 규칙과 같은 모양(로컬@도메인.TLD)만 통과시킨다.
pub fn email(issues: &mut Issues, field: &str, value: &str) {
    if !is_email(value) {
        issues.push(IssueKind::Email, field, "Invalid email: Received a malformed address");
    }
}

fn is_email(value: &str) -> bool {
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };
    if local.is_empty() || domain.is_empty() || value.contains(char::is_whitespace) {
        return false;
    }
    if local.contains('@') || domain.contains('@') {
        return false;
    }
    // 도메인은 점으로 나뉜 라벨 2개 이상이고 마지막 라벨(TLD)은 2자 이상의 알파벳
    let labels: Vec<&str> = domain.split('.').collect();
    if labels.len() < 2 || labels.iter().any(|label| label.is_empty()) {
        return false;
    }
    let tld = labels[labels.len() - 1];
    tld.chars().count() >= 2 && tld.chars().all(|c| c.is_ascii_alphabetic())
}

/// `v.isoDate()` — 'YYYY-MM-DD'. 달력상 실존하는 날짜여야 한다.
pub fn iso_date(issues: &mut Issues, field: &str, value: &str) {
    if !is_iso_date(value) {
        issues.push(IssueKind::IsoDate, field, "Invalid date: Received a malformed value");
    }
}

fn is_iso_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
        return false;
    }
    if !bytes.iter().enumerate().all(|(i, b)| i == 4 || i == 7 || b.is_ascii_digit()) {
        return false;
    }
    let year: u32 = value[0..4].parse().unwrap_or(0);
    let month: u32 = value[5..7].parse().unwrap_or(0);
    let day: u32 = value[8..10].parse().unwrap_or(0);
    (1..=12).contains(&month) && day >= 1 && day <= days_in_month(year, month)
}

fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        _ => 0,
    }
}

/// `v.isoTime()` — 'HH:mm' (00:00–23:59)
pub fn iso_time(issues: &mut Issues, field: &str, value: &str) {
    if !is_iso_time(value) {
        issues.push(IssueKind::IsoTime, field, "Invalid time: Received a malformed value");
    }
}

fn is_iso_time(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 5 || bytes[2] != b':' {
        return false;
    }
    if !bytes.iter().enumerate().all(|(i, b)| i == 2 || b.is_ascii_digit()) {
        return false;
    }
    let hour: u32 = value[0..2].parse().unwrap_or(99);
    let minute: u32 = value[3..5].parse().unwrap_or(99);
    hour < 24 && minute < 60
}

/// `v.minValue(n)` — 정수 하한
pub fn min_value(issues: &mut Issues, field: &str, value: i64, min: i64) {
    if value < min {
        issues.push(
            IssueKind::MinValue,
            field,
            format!("Invalid value: Expected >={min} but received {value}"),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_규칙() {
        assert!(is_email("test@tooday.app"));
        assert!(is_email("you@example.com"));
        assert!(!is_email("nope"));
        assert!(!is_email("nope@"));
        assert!(!is_email("@nope.com"));
        assert!(!is_email("a@b"));
        assert!(!is_email("a b@c.com"));
    }

    #[test]
    fn iso_date_규칙() {
        assert!(is_iso_date("2026-07-04"));
        assert!(is_iso_date("2024-02-29"), "윤년 2월 29일은 유효하다");
        assert!(!is_iso_date("2026-02-30"));
        assert!(!is_iso_date("2026-13-01"));
        assert!(!is_iso_date("2026-7-4"));
        assert!(!is_iso_date("20260704"));
    }

    #[test]
    fn iso_time_규칙() {
        assert!(is_iso_time("00:00"));
        assert!(is_iso_time("23:59"));
        assert!(!is_iso_time("24:00"));
        assert!(!is_iso_time("09:60"));
        assert!(!is_iso_time("9:00"));
    }

    #[test]
    fn issue_kind_이름은_valibot_계약이다() {
        assert_eq!(IssueKind::MinLength.as_str(), "min_length");
        assert_eq!(IssueKind::Email.as_str(), "email");
        assert_eq!(IssueKind::IsoDate.as_str(), "iso_date");
    }
}
