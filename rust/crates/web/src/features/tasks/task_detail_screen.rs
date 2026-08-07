use dioxus::prelude::*;
use tooday_shared::{Patch, ProjectListResponse, TaskPatch, TaskResponse, TaskStatus, UpdateTaskRequest};

use crate::app::api::{projects_key, range_prefix, task_key};
use crate::app::hooks::{cached, use_app, use_cached_query};
use crate::entities::task::patch::apply_task_patch;
use crate::entities::task::status::{status_chip_tone, status_dot_tone, STATUS_ORDER};
use crate::features::tasks::task_fields::{
    project_options, MetaList, MetaRow, OptionSheet, ProjectValue, ScheduleSheet, ScheduleValue, SheetOption,
    NO_PROJECT_KEY,
};
use crate::features::today::today_screen::IconButton;
use crate::shared::query::OptimisticPatch;
use crate::shared::time::{format_date_label, parse_iso_date, WeekdayStyle};
use crate::shared::ui::icons;
use crate::shared::ui::{
    status_label, AppBar, BaseButton, Button, ButtonSize, ButtonTone, Chip, ChipSize, Divider, Dot, DotSize,
    Gap, Input, InputVariant, Stack, Text, TextTone, TextVariant,
};

#[component]
pub fn TaskDetailScreen(
    task_id: String,
    onnavigate: EventHandler<String>,
    onback: EventHandler<()>,
) -> Element {
    let app = use_app();
    let t = app.t;
    let locale = app.locale;

    let key = task_key(&task_id);
    let task_query = use_cached_query::<TaskResponse, _, _>(key.clone(), {
        let task_id = task_id.clone();
        move |client| {
            let task_id = task_id.clone();
            async move { client.task_by_id(&task_id).await }
        }
    });
    let projects_query =
        use_cached_query::<ProjectListResponse, _, _>(projects_key(), move |client| async move {
            client.projects().await
        });
    let _ = task_query.read();
    let _ = projects_query.read();

    let Some(task) = cached::<TaskResponse>(&app.trpc, &key).map(|response| response.task) else {
        return rsx! {
            main { class: "screen-content",
                Stack { center: true,
                    Text { variant: TextVariant::BodySm, tone: TextTone::Placeholder,
                        "{t.task_detail.not_found}" }
                }
            }
        };
    };

    let projects: Vec<tooday_shared::Project> = cached::<ProjectListResponse>(&app.trpc, &projects_key())
        .map(|data| data.projects.into_iter().map(|summary| summary.project).collect())
        .unwrap_or_default();
    let project =
        task.project_id.as_deref().and_then(|id| projects.iter().find(|project| project.id == id)).cloned();

    let mut title_draft = use_signal(|| task.title.clone());
    let mut status_sheet_open = use_signal(|| false);
    let mut project_sheet_open = use_signal(|| false);
    let mut schedule_sheet_open = use_signal(|| false);
    let mut deleting = use_signal(|| false);
    let mut delete_failed = use_signal(|| false);

    let date_label = parse_iso_date(&task.date)
        .map(|date| format_date_label(locale, date, WeekdayStyle::Short))
        .unwrap_or_else(|| task.date.clone());

    // 의도 기반 부분 업데이트 — 낙관적 패치 후 서버 결과로 수렴한다
    let patch_task = {
        let app = app.clone();
        let key = key.clone();
        let task_id = task_id.clone();
        move |patch: TaskPatch| {
            let optimistic = OptimisticPatch::<TaskResponse>::begin(&app.trpc.query_client, key.clone(), {
                let patch = patch.clone();
                move |current: TaskResponse| TaskResponse { task: apply_task_patch(&current.task, &patch) }
            });
            let app = app.clone();
            let request = UpdateTaskRequest { id: task_id.clone(), patch };
            spawn(async move {
                if app.trpc.update_task(&request).await.is_err() {
                    optimistic.rollback();
                }
                optimistic.settle();
            });
        }
    };

    let commit_title = {
        let patch_task = patch_task.clone();
        let current_title = task.title.clone();
        move |_| {
            let next = title_draft().trim().to_owned();
            if !next.is_empty() && next != current_title {
                patch_task(TaskPatch { title: Patch::Set(next), ..TaskPatch::default() });
            } else {
                title_draft.set(current_title.clone());
            }
        }
    };

    let remove = {
        let app = app.clone();
        let key = key.clone();
        let task_id = task_id.clone();
        move |_| {
            deleting.set(true);
            delete_failed.set(false);
            let app = app.clone();
            let key = key.clone();
            let task_id = task_id.clone();
            spawn(async move {
                match app.trpc.delete_task(&task_id).await {
                    Ok(_) => {
                        // 전략 ④(떠나며 다음 화면이 채움) — 캐시를 지워야 새로 채워진다
                        app.trpc.query_client.remove_queries(&range_prefix());
                        onnavigate.call("/today".into());
                        // 삭제된 태스크가 뒤로가기로 되살아나지 않게 단건 캐시도 지운다
                        app.trpc.query_client.remove_queries(&key);
                    }
                    Err(_) => {
                        deleting.set(false);
                        delete_failed.set(true);
                    }
                }
            });
        }
    };

    let status_options: Vec<SheetOption> = STATUS_ORDER
        .iter()
        .map(|status| SheetOption {
            key: status.as_str().to_owned(),
            label: status_label(&t, *status).to_owned(),
            leading_tone: Some(status_dot_tone(*status)),
        })
        .collect();

    rsx! {
        div { class: "screen",
            header { class: "screen-header",
                AppBar {
                    title: t.task_detail.title.as_str().to_owned(),
                    leading: rsx! {
                        IconButton { icon: icons::chevron_left(22), label: t.common.back.as_str().to_owned(),
                            onclick: move |_| onback.call(()) }
                    },
                }
            }
            main { class: "screen-content",
                div { class: "task-detail-page",
                    Stack { gap: Gap::Lg,
                        Input {
                            variant: InputVariant::Inline,
                            value: title_draft(),
                            aria_label: t.task_detail.title.as_str().to_owned(),
                            oninput: move |value| title_draft.set(value),
                            onblur: commit_title,
                        }

                        BaseButton {
                            class: "task-status-button",
                            onclick: move |_| status_sheet_open.set(true),
                            Chip {
                                tone: status_chip_tone(task.status),
                                size: ChipSize::Lg,
                                leading: rsx! { Dot { size: DotSize::Sm, tone: status_dot_tone(task.status) } },
                                "{status_label(&t, task.status)}"
                            }
                        }
                    }

                    MetaList {
                        MetaRow {
                            label: t.task_detail.project.as_str().to_owned(),
                            value: rsx! {
                                ProjectValue {
                                    name: project.as_ref().map(|project| project.name.clone()),
                                    color: project.as_ref().map(|project| project.color),
                                }
                            },
                            onclick: move |_| project_sheet_open.set(true),
                        }
                        Divider {}
                        // 날짜는 표시만 — 변경은 일정(시간) 행에서 한다
                        MetaRow {
                            label: t.task_detail.date.as_str().to_owned(),
                            value: rsx! {
                                Text { variant: TextVariant::BodyStrong, "{date_label}" }
                            },
                        }
                        Divider {}
                        MetaRow {
                            label: t.task_detail.time.as_str().to_owned(),
                            value: rsx! {
                                ScheduleValue { start_at: task.start_at.clone(), duration_min: task.duration_min }
                            },
                            onclick: move |_| schedule_sheet_open.set(true),
                        }
                    }

                    Stack { gap: Gap::Md,
                        Button {
                            tone: ButtonTone::DangerSoft,
                            size: ButtonSize::Lg,
                            full_width: true,
                            loading: deleting(),
                            onclick: remove,
                            span { dangerous_inner_html: icons::trash(16) }
                            "{t.task_detail.delete}"
                        }
                        if delete_failed() {
                            Text { variant: TextVariant::BodySm, tone: TextTone::Danger, center: true,
                                "{t.common.error.unexpected}" }
                        }
                    }
                }
            }
        }

        OptionSheet {
            open: status_sheet_open(),
            title: t.task_detail.change_status.as_str().to_owned(),
            options: status_options,
            selected_key: task.status.as_str().to_owned(),
            onselect: {
                let patch_task = patch_task.clone();
                let current = task.status;
                move |key: String| {
                    if let Some(status) = TaskStatus::parse_str(&key) {
                        if status != current {
                            patch_task(TaskPatch { status: Patch::Set(status), ..TaskPatch::default() });
                        }
                    }
                    status_sheet_open.set(false);
                }
            },
            onclose: move |_| status_sheet_open.set(false),
        }

        OptionSheet {
            open: project_sheet_open(),
            title: t.task_detail.change_project.as_str().to_owned(),
            options: project_options(&t, &projects),
            selected_key: task.project_id.clone().unwrap_or_else(|| NO_PROJECT_KEY.to_owned()),
            onselect: {
                let patch_task = patch_task.clone();
                let current = task.project_id.clone();
                move |key: String| {
                    let next = (key != NO_PROJECT_KEY).then_some(key);
                    if next != current {
                        patch_task(TaskPatch { project_id: Patch::Set(next), ..TaskPatch::default() });
                    }
                    project_sheet_open.set(false);
                }
            },
            onclose: move |_| project_sheet_open.set(false),
        }

        ScheduleSheet {
            open: schedule_sheet_open(),
            start_at: task.start_at.clone(),
            duration_min: task.duration_min,
            onapply: {
                let patch_task = patch_task.clone();
                let current_start = task.start_at.clone();
                let current_duration = task.duration_min;
                move |(start_at, duration_min): (String, i64)| {
                    if start_at != current_start || duration_min != current_duration {
                        patch_task(TaskPatch {
                            start_at: Patch::Set(start_at),
                            duration_min: Patch::Set(duration_min),
                            ..TaskPatch::default()
                        });
                    }
                    schedule_sheet_open.set(false);
                }
            },
            onclose: move |_| schedule_sheet_open.set(false),
        }
    }
}
