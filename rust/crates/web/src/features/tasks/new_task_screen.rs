use chrono::NaiveDate;
use dioxus::prelude::*;
use tooday_shared::validate::IssueKind;
use tooday_shared::{CreateTaskRequest, ProjectListResponse};

use crate::app::api::{projects_key, range_prefix};
use crate::app::hooks::{use_app, use_cached_query};
use crate::features::tasks::task_fields::{
    project_options, MetaList, MetaRow, OptionSheet, ProjectValue, ScheduleSheet, ScheduleValue,
    NO_PROJECT_KEY,
};
use crate::features::today::today_screen::IconButton;
use crate::shared::form::{validate, FormErrors, FormMessages};
use crate::shared::time::to_iso_date;
use crate::shared::ui::icons;
use crate::shared::ui::{
    AppBar, Button, ButtonSize, ButtonTone, Divider, Gap, Input, InputVariant, Stack, Text, TextTone,
    TextVariant,
};

const DEFAULT_START: &str = "09:00";
const DEFAULT_DURATION: i64 = 30;

#[component]
pub fn NewTaskScreen(
    /// 기준 날짜 — 새 태스크의 기본 날짜(오늘). 라우트가 한 번 고정해 내려준다.
    now: NaiveDate,
    onnavigate: EventHandler<String>,
    onback: EventHandler<()>,
    /// 프로젝트 생성 시트 — feature 간 직접 import 대신 라우트(배선 층)가 주입한다
    new_project_sheet: Element,
    /// 시트 열림 상태를 라우트가 소유하도록 열기 요청만 올린다
    onrequest_new_project: EventHandler<()>,
) -> Element {
    let app = use_app();
    let t = app.t;

    let key = projects_key();
    let query = use_cached_query::<ProjectListResponse, _, _>(key.clone(), move |client| async move {
        client.projects().await
    });
    let _ = query.read();
    let projects: Vec<tooday_shared::Project> = app
        .cached::<ProjectListResponse>(&key)
        .map(|data| data.projects.into_iter().map(|summary| summary.project).collect())
        .unwrap_or_default();

    let mut title = use_signal(String::new);
    let mut project_id = use_signal(|| None::<String>);
    let mut start_at = use_signal(|| DEFAULT_START.to_owned());
    let mut duration_min = use_signal(|| DEFAULT_DURATION);
    let mut errors = use_signal(FormErrors::default);
    let mut submitting = use_signal(|| false);
    let mut project_sheet_open = use_signal(|| false);
    let mut schedule_sheet_open = use_signal(|| false);

    let date = to_iso_date(now);
    let messages = FormMessages::new().on("title", IssueKind::MinLength, t.task_new.title_required.as_str());

    let selected_project =
        projects.iter().find(|project| Some(&project.id) == project_id.read().as_ref()).cloned();

    let submit = move |event: FormEvent| {
        event.prevent_default();
        let app = app.clone();
        let messages = messages.clone();
        let request = CreateTaskRequest {
            title: title(),
            project_id: project_id(),
            date: date.clone(),
            start_at: start_at(),
            duration_min: duration_min(),
        };
        let parsed = match validate(request, &messages) {
            Ok(parsed) => parsed,
            Err(invalid) => {
                errors.set(invalid);
                return;
            }
        };
        errors.set(FormErrors::default());
        submitting.set(true);
        spawn(async move {
            match app.trpc.create_task(&parsed).await {
                Ok(_) => {
                    // 전략 ④(떠나며 다음 화면이 채움) — 캐시를 지워야 새로 채워진다
                    app.trpc.query_client.remove_queries(&range_prefix());
                    submitting.set(false);
                    onnavigate.call("/today".into());
                }
                Err(_) => {
                    submitting.set(false);
                    errors.set(FormErrors::default().with_form(t.common.error.unexpected.as_str()));
                }
            }
        });
    };

    rsx! {
        div { class: "screen",
            header { class: "screen-header",
                AppBar {
                    title: t.task_new.title.as_str().to_owned(),
                    leading: rsx! {
                        IconButton { icon: icons::chevron_left(22), label: t.common.back.as_str().to_owned(),
                            onclick: move |_| onback.call(()) }
                    },
                }
            }
            main { class: "screen-content",
                form { class: "task-new-page", novalidate: true, onsubmit: submit,
                    Stack { gap: Gap::Sm,
                        Input {
                            variant: InputVariant::Inline,
                            // 새 태스크 진입 시 바로 제목을 입력하게 한다
                            autofocus: true,
                            name: "title",
                            value: title(),
                            placeholder: t.task_new.title_placeholder.as_str().to_owned(),
                            aria_label: t.task_new.title_placeholder.as_str().to_owned(),
                            invalid: errors.read().field("title").is_some(),
                            oninput: move |value| title.set(value),
                        }
                        if let Some(message) = errors.read().field("title") {
                            Text { variant: TextVariant::BodySm, tone: TextTone::Danger, "{message}" }
                        }
                    }

                    MetaList {
                        MetaRow {
                            label: t.task_new.project.as_str().to_owned(),
                            value: rsx! {
                                ProjectValue {
                                    name: selected_project.as_ref().map(|project| project.name.clone()),
                                    color: selected_project.as_ref().map(|project| project.color),
                                }
                            },
                            onclick: move |_| project_sheet_open.set(true),
                        }
                        Divider {}
                        MetaRow {
                            label: t.task_new.time.as_str().to_owned(),
                            value: rsx! {
                                ScheduleValue { start_at: start_at(), duration_min: duration_min() }
                            },
                            onclick: move |_| schedule_sheet_open.set(true),
                        }
                    }

                    Stack { gap: Gap::Md,
                        Button {
                            submit: true,
                            tone: ButtonTone::Brand,
                            size: ButtonSize::Xl,
                            full_width: true,
                            disabled: title().trim().is_empty(),
                            loading: submitting(),
                            "{t.task_new.create}"
                        }
                        if let Some(message) = errors.read().form() {
                            Text { variant: TextVariant::BodySm, tone: TextTone::Danger, center: true,
                                "{message}" }
                        }
                    }
                }
            }
        }

        OptionSheet {
            open: project_sheet_open(),
            title: t.task_new.select_project.as_str().to_owned(),
            options: project_options(&t, &projects),
            selected_key: project_id().unwrap_or_else(|| NO_PROJECT_KEY.to_owned()),
            onselect: move |key: String| {
                project_id.set((key != NO_PROJECT_KEY).then_some(key));
                project_sheet_open.set(false);
            },
            onclose: move |_| project_sheet_open.set(false),
            action_label: t.task_new.create_project.as_str().to_owned(),
            onaction: move |_| {
                project_sheet_open.set(false);
                onrequest_new_project.call(());
            },
        }

        {new_project_sheet}

        ScheduleSheet {
            open: schedule_sheet_open(),
            start_at: start_at(),
            duration_min: duration_min(),
            onapply: move |(next_start, next_duration): (String, i64)| {
                start_at.set(next_start);
                duration_min.set(next_duration);
                schedule_sheet_open.set(false);
            },
            onclose: move |_| schedule_sheet_open.set(false),
        }
    }
}
