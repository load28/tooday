use dioxus::prelude::*;
use tooday_shared::ProjectListResponse;

use crate::app::api::projects_key;
use crate::app::hooks::{cached, use_app, use_cached_query};
use crate::features::projects::new_project_sheet::NewProjectSheet;
use crate::features::today::today_screen::IconButton;
use crate::shared::ui::icons;
use crate::shared::ui::{
    AppBar, Card, CardPadding, CardRadius, Dot, DotSize, DotTone, Gap, HStack, ProgressBar, Stack, Text,
    TextTag, TextTone, TextVariant,
};

/// 뷰포트와 하단 탭바는 탭 레이아웃이 소유한다 — 여기선 헤더·본문만 그린다.
#[component]
pub fn ProjectsScreen(onnavigate: EventHandler<String>) -> Element {
    let app = use_app();
    let t = app.t;
    let mut create_open = use_signal(|| false);

    let key = projects_key();
    let query = use_cached_query::<ProjectListResponse, _, _>(key.clone(), move |client| async move {
        client.projects().await
    });
    let _ = query.read();
    let data: Option<ProjectListResponse> = cached(&app.trpc, &key);
    let projects = data.map(|data| data.projects).unwrap_or_default();

    rsx! {
        header { class: "screen-header",
            AppBar {
                title: t.projects.title.as_str().to_owned(),
                trailing: rsx! {
                    IconButton { icon: icons::user_round(20), label: t.settings.open.as_str().to_owned(),
                        onclick: move |_| onnavigate.call("/settings".into()) }
                    IconButton { icon: icons::plus(22), label: t.projects.add_project.as_str().to_owned(),
                        onclick: move |_| create_open.set(true) }
                },
            }
        }
        main { class: "screen-content",
            div { class: "projects-hero",
                Stack { gap: Gap::Xxs,
                    Text { tag: TextTag::H1, variant: TextVariant::Title, "{t.projects.title}" }
                    Text { variant: TextVariant::BodySm, tone: TextTone::Tertiary, "{t.projects.subtitle}" }
                }
            }

            if projects.is_empty() {
                Stack { gap: Gap::Sm, center: true, class: "projects-empty",
                    span { dangerous_inner_html: icons::layout_grid(36) }
                    Text { variant: TextVariant::BodyLgStrong, tone: TextTone::Secondary,
                        "{t.projects.empty}" }
                }
            } else {
                Stack { gap: Gap::Md, class: "projects-list",
                    for project in projects {
                        {
                            // 전체가 0이면 0으로 나누지 않는다 — 진행률은 0%다
                            let ratio = if project.total_count > 0 {
                                project.done_count as f64 / project.total_count as f64
                            } else {
                                0.0
                            };
                            let id = project.project.id.clone();
                            rsx! {
                                Card {
                                    key: "{project.project.id}",
                                    interactive: true,
                                    radius: CardRadius::Xxl,
                                    padding: CardPadding::Lg,
                                    class: "projects-card",
                                    onclick: move |_| onnavigate.call(format!("/projects/{id}")),
                                    HStack { gap: Gap::Sm,
                                        Dot { size: DotSize::Sm, tone: DotTone::from(project.project.color) }
                                        Text { variant: TextVariant::Subtitle, truncate: true,
                                            "{project.project.name}" }
                                    }
                                    ProgressBar { value: ratio, tone: DotTone::from(project.project.color) }
                                    Text { variant: TextVariant::Caption, tone: TextTone::Tertiary,
                                        "{t.projects.progress.format(project.done_count, project.total_count)}" }
                                }
                            }
                        }
                    }
                }
            }

            NewProjectSheet {
                open: create_open(),
                onclose: move |_| create_open.set(false),
                oncreated: move |_| create_open.set(false),
            }
        }
    }
}
