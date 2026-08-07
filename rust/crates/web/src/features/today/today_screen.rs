use std::collections::HashMap;

use chrono::NaiveDate;
use dioxus::prelude::*;
use tooday_shared::{Patch, Task, TaskPatch, TaskRangeResponse, TaskStatus, UpdateTaskRequest};

use crate::app::api::range_key;
use crate::app::hooks::{cached, use_app, use_cached_query};
use crate::entities::task::patch::apply_task_patch;
use crate::features::today::task_card::TaskCard;
use crate::features::today::use_task_sync::use_task_sync;
use crate::features::today::week::{build_week, week_range};
use crate::features::today::week_strip::WeekStrip;
use crate::shared::query::OptimisticPatch;
use crate::shared::time::{format_duration, time_to_min};
use crate::shared::ui::icons;
use crate::shared::ui::{
    AppBar, Button, ButtonShape, ButtonSize, Card, CardPadding, CardRadius, Gap, Section, Stack, Text,
    TextTag, TextTone, TextVariant,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DaySection {
    Morning,
    Afternoon,
    Evening,
}

const SECTION_ORDER: [DaySection; 3] = [DaySection::Morning, DaySection::Afternoon, DaySection::Evening];

fn section_of(start_at: &str) -> DaySection {
    let hour = time_to_min(start_at) / 60;
    if hour < 12 {
        DaySection::Morning
    } else if hour < 18 {
        DaySection::Afternoon
    } else {
        DaySection::Evening
    }
}

/// 뷰포트와 하단 탭바는 탭 레이아웃이 소유한다 — 여기선 헤더·본문만 그린다.
#[component]
pub fn TodayScreen(
    /// 기준 날짜. 라우트가 한 번 고정해 내려준다 — 렌더마다 오늘이 흔들리지 않게 한다.
    now: NaiveDate,
    onnavigate: EventHandler<String>,
) -> Element {
    let app = use_app();
    let t = app.t;
    let range = week_range(now);
    let days = build_week(now, app.locale);
    let mut active_offset = use_signal(|| 0i64);

    let key = range_key(&range);
    let query = use_cached_query::<TaskRangeResponse, _, _>(key.clone(), {
        let range = range.clone();
        move |client| {
            let range = range.clone();
            async move { client.task_range(&range).await }
        }
    });

    // 다른 기기의 변경이 SSE 신호 → 델타 → 캐시 패치로 이 화면에 실시간 반영된다
    use_task_sync(range.clone());

    // 캐시를 진실로 읽는다 — 낙관적 패치와 델타 패치가 모두 캐시에 쓰이기 때문이다
    let data: Option<TaskRangeResponse> = match query.read().as_ref() {
        Some(Some(Ok(_))) | Some(None) | None => cached(&app.trpc, &key),
        Some(Some(Err(_))) => None,
    };
    let Some(data) = data else {
        return rsx! {
            header { class: "screen-header",
                AppBar { title: t.today.title.as_str().to_owned() }
            }
            main { class: "screen-content",
                Stack { gap: Gap::Sm, center: true, class: "today-empty",
                    Text { variant: TextVariant::BodySm, tone: TextTone::Tertiary, "{t.common.loading}" }
                }
            }
        };
    };

    let project_by_id: HashMap<&str, _> =
        data.projects.iter().map(|project| (project.id.as_str(), project)).collect();

    let mut tasks_by_date: HashMap<&str, Vec<&Task>> = HashMap::new();
    for task in &data.tasks {
        tasks_by_date.entry(task.date.as_str()).or_default().push(task);
    }
    // 델타 패치가 행을 뒤에 붙이므로 표시 순서는 여기서 보장한다
    for list in tasks_by_date.values_mut() {
        list.sort_by_key(|task| time_to_min(&task.start_at));
    }

    let day = days.iter().find(|cell| cell.offset == active_offset()).or_else(|| days.first()).cloned();
    let Some(day) = day else { return rsx! {} };

    let marked: Vec<bool> = days
        .iter()
        .map(|cell| tasks_by_date.get(cell.key.as_str()).is_some_and(|list| !list.is_empty()))
        .collect();

    let tasks: Vec<Task> = tasks_by_date
        .get(day.key.as_str())
        .map(|list| list.iter().map(|task| (*task).clone()).collect())
        .unwrap_or_default();
    let remaining = tasks.iter().filter(|task| task.status != TaskStatus::Done).count();

    let toggle = {
        let app = app.clone();
        let key = key.clone();
        move |task: Task| {
            let next_status =
                if task.status == TaskStatus::Done { TaskStatus::Todo } else { TaskStatus::Done };
            let patch = TaskPatch { status: Patch::Set(next_status), ..TaskPatch::default() };
            let request = UpdateTaskRequest { id: task.id.clone(), patch: patch.clone() };

            // 낙관적 패치 — 서버가 할 일을 캐시에 미리 흉내낸다
            let optimistic = OptimisticPatch::<TaskRangeResponse>::begin(
                &app.trpc.query_client,
                key.clone(),
                move |mut current| {
                    for cached_task in current.tasks.iter_mut() {
                        if cached_task.id == request.id {
                            *cached_task = apply_task_patch(cached_task, &patch);
                        }
                    }
                    current
                },
            );

            let app = app.clone();
            spawn(async move {
                let outcome = app
                    .trpc
                    .update_task(&UpdateTaskRequest { id: task.id, patch: task_status_patch(next_status) })
                    .await;
                if outcome.is_err() {
                    optimistic.rollback();
                }
                optimistic.settle();
            });
        }
    };

    let hero_label = if day.is_today { t.today.hero.today.format(&day.label) } else { day.label.clone() };

    rsx! {
        header { class: "screen-header",
            AppBar {
                title: t.today.title.as_str().to_owned(),
                trailing: rsx! {
                    IconButton { icon: icons::user_round(20), label: t.settings.open.as_str().to_owned(),
                        onclick: move |_| onnavigate.call("/settings".into()) }
                    IconButton { icon: icons::bell(20), label: t.today.notifications.as_str().to_owned(),
                        onclick: move |_| {} }
                    IconButton { icon: icons::plus(22), label: t.today.add_task.as_str().to_owned(),
                        onclick: move |_| onnavigate.call("/tasks/new".into()) }
                },
            }
        }
        main { class: "screen-content",
            div { class: "today-page",
                Card { radius: CardRadius::Xxl, padding: CardPadding::Lg, class: "today-hero",
                    Stack { gap: Gap::Xs,
                        Text { variant: TextVariant::Label, tone: TextTone::Brand, "{hero_label}" }
                        Text { tag: TextTag::H1, variant: TextVariant::Display,
                            "{t.today.hero.remaining_prefix} "
                            Text { variant: TextVariant::Display, tone: TextTone::Brand,
                                "{t.today.hero.remaining_count.format(remaining)}" }
                            " "
                            Text { variant: TextVariant::Display, tone: TextTone::Tertiary,
                                "{t.today.hero.remaining_suffix}" }
                        }
                    }
                }

                WeekStrip {
                    days: days.clone(),
                    active_offset: active_offset(),
                    marked,
                    onselect: move |offset| active_offset.set(offset),
                }

                if tasks.is_empty() {
                    Stack { gap: Gap::Sm, center: true, class: "today-empty",
                        span { dangerous_inner_html: icons::calendar_x(36) }
                        Text { variant: TextVariant::BodyLgStrong, tone: TextTone::Secondary,
                            "{t.today.empty.title}" }
                        Text { variant: TextVariant::BodySm, tone: TextTone::Tertiary,
                            "{t.today.empty.description}" }
                    }
                } else {
                    for section in SECTION_ORDER {
                        {
                            let items: Vec<Task> = tasks
                                .iter()
                                .filter(|task| section_of(&task.start_at) == section)
                                .cloned()
                                .collect();
                            if items.is_empty() {
                                rsx! {}
                            } else {
                                rsx! {
                                    Section { title: section_title(&t, section).to_owned(),
                                        div { class: "today-timeline",
                                            for task in items {
                                                div { key: "{task.id}", class: "today-row",
                                                    div { class: "today-time-col",
                                                        Text { variant: TextVariant::Numeric, tone: TextTone::Secondary,
                                                            "{task.start_at}" }
                                                        Text { variant: TextVariant::Micro, tone: TextTone::Placeholder,
                                                            "{format_duration(&t, task.duration_min)}" }
                                                    }
                                                    TaskCard {
                                                        task: task.clone(),
                                                        project: task
                                                            .project_id
                                                            .as_deref()
                                                            .and_then(|id| project_by_id.get(id).map(|p| (*p).clone())),
                                                        ontoggle: toggle.clone(),
                                                        onopen: {
                                                            let id = task.id.clone();
                                                            move |_| onnavigate.call(format!("/tasks/{id}"))
                                                        },
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
        }
    }
}

fn task_status_patch(status: TaskStatus) -> TaskPatch {
    TaskPatch { status: Patch::Set(status), ..TaskPatch::default() }
}

fn section_title(t: &crate::shared::i18n::Messages, section: DaySection) -> &'static str {
    match section {
        DaySection::Morning => t.today.section.morning.as_str(),
        DaySection::Afternoon => t.today.section.afternoon.as_str(),
        DaySection::Evening => t.today.section.evening.as_str(),
    }
}

/// 앱바에 반복되는 아이콘 버튼 — 크기·모양 variant를 한 곳에 고정한다
#[component]
pub fn IconButton(icon: String, label: String, onclick: EventHandler<()>) -> Element {
    rsx! {
        Button {
            size: ButtonSize::Icon,
            shape: ButtonShape::Square,
            aria_label: label,
            onclick: move |_| onclick.call(()),
            span { dangerous_inner_html: icon }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 시작_시각이_하루_구간을_가른다() {
        assert_eq!(section_of("00:00"), DaySection::Morning);
        assert_eq!(section_of("11:59"), DaySection::Morning);
        assert_eq!(section_of("12:00"), DaySection::Afternoon);
        assert_eq!(section_of("17:59"), DaySection::Afternoon);
        assert_eq!(section_of("18:00"), DaySection::Evening);
        assert_eq!(section_of("23:59"), DaySection::Evening);
    }
}
