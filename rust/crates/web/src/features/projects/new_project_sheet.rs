use dioxus::prelude::*;
use tooday_shared::{CreateProjectRequest, Project, ProjectColor, PROJECT_COLORS};

use crate::app::api::projects_key;
use crate::app::hooks::use_app;
use crate::shared::form::{validate, FormErrors, FormMessages};
use crate::shared::ui::{
    BottomSheet, Button, ButtonSize, ButtonTone, ColorSwatch, ColorSwatchGroup, DotTone, Gap, InputSize,
    Stack, Text, TextField, TextTone, TextVariant,
};
use tooday_shared::validate::IssueKind;

/// 새 프로젝트 생성 바텀시트 — 이름 + 색상.
/// 시트는 닫히면 언마운트되므로 다시 열 때 폼이 새로 초기화된다.
#[component]
pub fn NewProjectSheet(
    open: bool,
    onclose: EventHandler<()>,
    /// 생성 성공 시 — 시트 닫기·생성된 프로젝트 선택 등은 호출부가 결정한다
    oncreated: EventHandler<Project>,
) -> Element {
    let t = use_app().t;
    rsx! {
        BottomSheet {
            open,
            aria_label: t.project_new.title.as_str().to_owned(),
            title: t.project_new.title.as_str().to_owned(),
            onclose,
            NewProjectForm { oncreated }
        }
    }
}

#[component]
fn NewProjectForm(oncreated: EventHandler<Project>) -> Element {
    let app = use_app();
    let t = app.t;
    let mut name = use_signal(String::new);
    let mut color = use_signal(|| ProjectColor::Blue);
    let mut errors = use_signal(FormErrors::default);
    let mut submitting = use_signal(|| false);

    let messages = FormMessages::new().on("name", IssueKind::MinLength, t.project_new.name_required.as_str());

    let submit = move |event: FormEvent| {
        // 브라우저 기본 제출(페이지 이동)을 막고 폼 로직으로 처리한다
        event.prevent_default();
        let app = app.clone();
        let messages = messages.clone();
        let request = CreateProjectRequest { name: name(), color: color() };
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
            match app.trpc.create_project(&parsed).await {
                Ok(response) => {
                    // 목록 화면이 새 프로젝트를 반영하도록 캐시를 무효화한다
                    app.trpc.query_client.invalidate_queries(&projects_key());
                    submitting.set(false);
                    oncreated.call(response.project);
                }
                Err(_) => {
                    submitting.set(false);
                    errors.set(FormErrors::default().with_form(t.common.error.unexpected.as_str()));
                }
            }
        });
    };

    rsx! {
        form { novalidate: true, onsubmit: submit,
            Stack { gap: Gap::Xxl,
                TextField {
                    label: t.project_new.name_label.as_str().to_owned(),
                    name: "name",
                    autofocus: true,
                    placeholder: t.project_new.name_placeholder.as_str().to_owned(),
                    value: name(),
                    error: errors.read().field("name"),
                    oninput: move |value| name.set(value),
                }

                Stack { gap: Gap::Md,
                    Text { variant: TextVariant::Label, tone: TextTone::Secondary,
                        "{t.project_new.color_label}" }
                    ColorSwatchGroup {
                        aria_label: t.project_new.color_label.as_str().to_owned(),
                        class: "color-row",
                        for option in PROJECT_COLORS {
                            ColorSwatch {
                                key: "{option.as_str()}",
                                tone: DotTone::from(option),
                                selected: color() == option,
                                aria_label: color_label(&t, option).to_owned(),
                                onclick: move |_| color.set(option),
                            }
                        }
                    }
                }

                Stack { gap: Gap::Md,
                    Button {
                        submit: true,
                        tone: ButtonTone::Brand,
                        size: ButtonSize::Lg,
                        full_width: true,
                        disabled: name().trim().is_empty(),
                        loading: submitting(),
                        "{t.project_new.create}"
                    }
                    if let Some(message) = errors.read().form() {
                        Text { variant: TextVariant::BodySm, tone: TextTone::Danger, center: true,
                            "{message}" }
                    }
                }
            }
        }
    }
}

/// 색상 칩의 접근성 라벨 — 키는 프로젝트 색 계약과 1:1
fn color_label(t: &crate::shared::i18n::Messages, color: ProjectColor) -> &'static str {
    match color {
        ProjectColor::Blue => t.project_new.color.blue.as_str(),
        ProjectColor::Mint => t.project_new.color.mint.as_str(),
        ProjectColor::Violet => t.project_new.color.violet.as_str(),
        ProjectColor::Amber => t.project_new.color.amber.as_str(),
        ProjectColor::Pink => t.project_new.color.pink.as_str(),
        ProjectColor::Gray => t.project_new.color.gray.as_str(),
    }
}

/// `InputSize`는 TextField 기본값으로만 쓰이지만, 폼 크기 계약을 여기서 고정해 둔다
#[allow(dead_code)]
const FORM_INPUT_SIZE: InputSize = InputSize::Md;
