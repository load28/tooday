//! 인라인 SVG 아이콘 — TS의 lucide-react 대응.
//! 아이콘 하나가 문자열 상수라 번들에 아이콘 라이브러리를 싣지 않는다.

const STROKE: &str =
    r#"fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round""#;

fn svg(size: u32, body: &str) -> String {
    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" {STROKE} aria-hidden="true">{body}</svg>"#
    )
}

pub fn chevron_left(size: u32) -> String {
    svg(size, r#"<path d="m15 18-6-6 6-6"/>"#)
}

pub fn chevron_right(size: u32) -> String {
    svg(size, r#"<path d="m9 18 6-6-6-6"/>"#)
}

pub fn plus(size: u32) -> String {
    svg(size, r#"<path d="M5 12h14"/><path d="M12 5v14"/>"#)
}

pub fn check(size: u32) -> String {
    svg(size, r#"<path d="M20 6 9 17l-5-5"/>"#)
}

pub fn bell(size: u32) -> String {
    svg(
        size,
        r#"<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>"#,
    )
}

pub fn user_round(size: u32) -> String {
    svg(size, r#"<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>"#)
}

pub fn calendar_days(size: u32) -> String {
    svg(
        size,
        r#"<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>"#,
    )
}

pub fn layout_grid(size: u32) -> String {
    svg(
        size,
        r#"<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>"#,
    )
}

pub fn calendar_x(size: u32) -> String {
    svg(
        size,
        r#"<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m14 14 4 4"/><path d="m18 14-4 4"/>"#,
    )
}

pub fn trash(size: u32) -> String {
    svg(
        size,
        r#"<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>"#,
    )
}

pub fn loader_circle(size: u32) -> String {
    svg(size, r#"<path d="M21 12a9 9 0 1 1-6.219-8.56"/>"#)
}
