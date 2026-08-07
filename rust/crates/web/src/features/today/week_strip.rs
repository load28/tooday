use dioxus::prelude::*;

use crate::features::today::week::DayCell;
use crate::shared::ui::flag;

#[component]
pub fn WeekStrip(
    days: Vec<DayCell>,
    active_offset: i64,
    /// 그 날에 태스크가 있는지 — 셀 아래 점 표시의 근거
    marked: Vec<bool>,
    onselect: EventHandler<i64>,
) -> Element {
    rsx! {
        div { class: "week-strip", role: "group",
            for (index, day) in days.into_iter().enumerate() {
                button {
                    key: "{day.key}",
                    r#type: "button",
                    class: "base-button week-cell",
                    "data-tone": if day.is_today { "today" } else { "idle" },
                    // 단일 선택 — Ark ToggleGroup이 붙이던 data-state와 같은 계약
                    "data-state": if day.offset == active_offset { "on" } else { "off" },
                    "data-active": flag(day.offset == active_offset),
                    "aria-label": "{day.label}",
                    "aria-pressed": (day.offset == active_offset).to_string(),
                    onclick: move |_| onselect.call(day.offset),
                    span { class: "week-dow", "{day.dow}" }
                    span { class: "week-day", "{day.day}" }
                    span {
                        class: "week-dot",
                        "data-mark": if marked.get(index).copied().unwrap_or(false) { "tasks" } else { "none" },
                    }
                }
            }
        }
    }
}
