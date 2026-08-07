use std::collections::HashMap;

use dioxus::prelude::*;
use tooday_shared::{ProjectDetailResponse, Task, TaskStatus};

use crate::app::api::project_key;
use crate::app::hooks::{cached, use_app, use_cached_query};
use crate::entities::task::status::STATUS_ORDER;
use crate::features::today::today_screen::IconButton;
use crate::shared::ui::icons;
use crate::shared::ui::{
    flag, status_label, AppBar, Card, CardPadding, Dot, DotSize, DotTone, Gap, Row, Stack, Text, TextTone,
    TextVariant,
};

/// 뷰포트와 하단 탭바는 탭 레이아웃이 소유한다 — 여기선 헤더·본문만 그린다.
#[component]
pub fn ProjectDetailScreen(
    project_id: String,
    onnavigate: EventHandler<String>,
    onback: EventHandler<()>,
) -> Element {
    let app = use_app();
    let t = app.t;
    let mut tab = use_signal(|| TaskStatus::Todo);

    let key = project_key(&project_id);
    let query = use_cached_query::<ProjectDetailResponse, _, _>(key.clone(), {
        let project_id = project_id.clone();
        move |client| {
            let project_id = project_id.clone();
            async move { client.project(&project_id).await }
        }
    });
    let _ = query.read();
    let Some(data) = cached::<ProjectDetailResponse>(&app.trpc, &key) else {
        return rsx! {
            main { class: "screen-content",
                Stack { center: true, class: "board-empty",
                    Text { variant: TextVariant::BodySm, tone: TextTone::Placeholder, "{t.common.loading}" }
                }
            }
        };
    };

    let mut by_status: HashMap<TaskStatus, Vec<Task>> = HashMap::new();
    for task in &data.tasks {
        by_status.entry(task.status).or_default().push(task.clone());
    }
    let items = by_status.get(&tab()).cloned().unwrap_or_default();

    rsx! {
        header { class: "screen-header",
            AppBar {
                title: data.project.name.clone(),
                leading: rsx! {
                    IconButton { icon: icons::chevron_left(22), label: t.common.back.as_str().to_owned(),
                        onclick: move |_| onback.call(()) }
                },
                trailing: rsx! {
                    IconButton { icon: icons::plus(22), label: t.project_detail.add_task.as_str().to_owned(),
                        onclick: move |_| onnavigate.call("/tasks/new".into()) }
                },
            }
        }
        main { class: "screen-content",
            div { class: "board-segment", role: "group",
                for status in STATUS_ORDER {
                    button {
                        key: "{status.as_str()}",
                        r#type: "button",
                        class: "base-button board-segment-button",
                        // 단일 선택 — 선택된 세그먼트를 다시 눌러 빈 상태가 되는 일은 없다
                        "data-state": if tab() == status { "on" } else { "off" },
                        "data-active": flag(tab() == status),
                        "aria-pressed": (tab() == status).to_string(),
                        onclick: move |_| tab.set(status),
                        span { "{status_label(&t, status)}" }
                        Text {
                            variant: TextVariant::Micro,
                            tone: if tab() == status { TextTone::Tertiary } else { TextTone::Placeholder },
                            "{by_status.get(&status).map(Vec::len).unwrap_or(0)}"
                        }
                    }
                }
            }

            if items.is_empty() {
                Stack { center: true, class: "board-empty",
                    Text { variant: TextVariant::BodySm, tone: TextTone::Placeholder,
                        "{t.project_detail.empty}" }
                }
            } else {
                Stack { gap: Gap::Md, class: "board-list",
                    for task in items {
                        {
                            let is_done = task.status == TaskStatus::Done;
                            let id = task.id.clone();
                            let dot_tone = if is_done { DotTone::Muted } else { DotTone::from(data.project.color) };
                            rsx! {
                                Card {
                                    key: "{task.id}",
                                    interactive: true,
                                    padding: CardPadding::None,
                                    class: "board-row",
                                    onclick: move |_| onnavigate.call(format!("/tasks/{id}")),
                                    Row {
                                        leading: rsx! { Dot { size: DotSize::Sm, tone: dot_tone } },
                                        trailing: rsx! {
                                            Text { variant: TextVariant::Numeric, tone: TextTone::Tertiary,
                                                "{task.start_at}" }
                                        },
                                        Text {
                                            variant: TextVariant::BodyStrong,
                                            tone: if is_done { TextTone::Tertiary } else { TextTone::Default },
                                            truncate: true,
                                            strike: is_done,
                                            "{task.title}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
