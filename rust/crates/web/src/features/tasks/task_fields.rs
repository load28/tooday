//! 신규·상세 화면이 공유하는 조각 — 메타 행, 옵션 시트, 스케줄 시트.

use dioxus::prelude::*;
use tooday_shared::{Project, ProjectColor};

use crate::app::hooks::use_app;
use crate::shared::time::{end_time, format_duration};
use crate::shared::ui::icons;
use crate::shared::ui::{
    BottomSheet, Button, ButtonShape, ButtonSize, ButtonTone, Card, CardPadding, Divider, Dot, DotSize,
    DotTone, Gap, HStack, Input, InputVariant, Row, Stack, Text, TextTone, TextVariant,
};

/// 프로젝트 선택 시트의 '없음' 옵션 키 — 태스크의 project_id=None에 대응
/// (UUID와 충돌하지 않는 sentinel)
pub const NO_PROJECT_KEY: &str = "__none__";

/// 스케줄 시트에서 고를 수 있는 기간(분) 프리셋
pub const DURATION_OPTIONS: [i64; 6] = [15, 30, 45, 60, 90, 120];

#[derive(Debug, Clone, PartialEq)]
pub struct SheetOption {
    pub key: String,
    pub label: String,
    pub leading_tone: Option<DotTone>,
}

/// 프로젝트 선택 시트 옵션 — 맨 앞에 '없음', 이어서 색 점을 단 프로젝트들
pub fn project_options(t: &crate::shared::i18n::Messages, projects: &[Project]) -> Vec<SheetOption> {
    let mut options = vec![SheetOption {
        key: NO_PROJECT_KEY.to_owned(),
        label: t.common.no_project.as_str().to_owned(),
        leading_tone: Some(DotTone::Muted),
    }];
    options.extend(projects.iter().map(|project| SheetOption {
        key: project.id.clone(),
        label: project.name.clone(),
        leading_tone: Some(DotTone::from(project.color)),
    }));
    options
}

/// 상세·신규 화면의 메타 카드 한 줄 — 좌측 라벨 + 우측 값(+ 편집 가능하면 chevron)
#[component]
pub fn MetaRow(
    label: String,
    value: Element,
    #[props(default)] onclick: Option<EventHandler<()>>,
) -> Element {
    let interactive = onclick.is_some();
    rsx! {
        Row {
            interactive,
            onclick: move |_| {
                if let Some(handler) = &onclick {
                    handler.call(());
                }
            },
            trailing: rsx! {
                span { class: "meta-value", {value} }
                if interactive {
                    span { dangerous_inner_html: icons::chevron_right(16) }
                }
            },
            Text { variant: TextVariant::Label, tone: TextTone::Secondary, "{label}" }
        }
    }
}

/// MetaRow들을 하나의 카드로 묶는다. 사이 구분선은 호출부가 넣는다 — 행 개수가 고정이라
/// 순서가 곧 정체성이다.
#[component]
pub fn MetaList(children: Element) -> Element {
    rsx! {
        Card { padding: CardPadding::None, {children} }
    }
}

/// 단일 선택 바텀시트 — 상태·프로젝트 선택에 공용
#[component]
pub fn OptionSheet(
    open: bool,
    title: String,
    options: Vec<SheetOption>,
    selected_key: String,
    onselect: EventHandler<String>,
    onclose: EventHandler<()>,
    /// 옵션 목록 아래에 붙는 보조 액션 — 예: '새 프로젝트 만들기'
    #[props(default)]
    action_label: Option<String>,
    #[props(default)] onaction: Option<EventHandler<()>>,
) -> Element {
    rsx! {
        BottomSheet { open, aria_label: title.clone(), title: title.clone(), onclose,
            Stack { gap: Gap::Xxs,
                for option in options {
                    {
                        let key = option.key.clone();
                        let is_selected = option.key == selected_key;
                        rsx! {
                            Row {
                                key: "{option.key}",
                                interactive: true,
                                flush: true,
                                leading: rsx! {
                                    if let Some(tone) = option.leading_tone {
                                        Dot { size: DotSize::Sm, tone }
                                    }
                                },
                                trailing: rsx! {
                                    if is_selected {
                                        span { class: "check-icon", dangerous_inner_html: icons::check(20) }
                                    }
                                },
                                onclick: move |_| onselect.call(key.clone()),
                                Text { variant: TextVariant::BodyLg, "{option.label}" }
                            }
                        }
                    }
                }
                if let (Some(label), Some(handler)) = (action_label, onaction) {
                    Divider {}
                    Row {
                        interactive: true,
                        flush: true,
                        leading: rsx! {
                            span { class: "check-icon", dangerous_inner_html: icons::plus(18) }
                        },
                        onclick: move |_| handler.call(()),
                        Text { variant: TextVariant::BodyLg, tone: TextTone::Brand, "{label}" }
                    }
                }
            }
        }
    }
}

/// 시작 시각 + 기간 선택 바텀시트.
/// 시트는 닫히면 언마운트되므로 다시 열 때 초안이 새로 초기화된다 — 별도 리셋이 필요 없다.
#[component]
pub fn ScheduleSheet(
    open: bool,
    start_at: String,
    duration_min: i64,
    onapply: EventHandler<(String, i64)>,
    onclose: EventHandler<()>,
) -> Element {
    let t = use_app().t;
    let mut draft_start = use_signal(|| start_at.clone());
    let mut draft_duration = use_signal(|| duration_min);

    rsx! {
        BottomSheet {
            open,
            aria_label: t.task_detail.change_schedule.as_str().to_owned(),
            title: t.task_detail.change_schedule.as_str().to_owned(),
            onclose,
            Stack { gap: Gap::Xxl,
                Stack { gap: Gap::Md,
                    Text { variant: TextVariant::Label, tone: TextTone::Secondary,
                        "{t.schedule.start_label}" }
                    Input {
                        input_type: "time".to_owned(),
                        step: 900,
                        value: draft_start(),
                        oninput: move |value| draft_start.set(value),
                    }
                }
                Stack { gap: Gap::Md,
                    Text { variant: TextVariant::Label, tone: TextTone::Secondary,
                        "{t.schedule.duration_label}" }
                    div {
                        class: "duration-row",
                        role: "group",
                        "aria-label": t.schedule.duration_label.as_str(),
                        for option in DURATION_OPTIONS {
                            button {
                                key: "{option}",
                                r#type: "button",
                                class: "base-button button",
                                "data-tone": ButtonTone::Subtle.as_str(),
                                "data-shape": ButtonShape::Pill.as_str(),
                                "data-size": ButtonSize::Sm.as_str(),
                                // 단일 선택 — 선택된 알약을 다시 눌러 빈 상태가 되는 것은 무시한다
                                "data-state": if draft_duration() == option { "on" } else { "off" },
                                "aria-pressed": (draft_duration() == option).to_string(),
                                onclick: move |_| draft_duration.set(option),
                                "{format_duration(&t, option)}"
                            }
                        }
                    }
                }
                Button {
                    tone: ButtonTone::Brand,
                    size: ButtonSize::Lg,
                    full_width: true,
                    onclick: move |_| onapply.call((draft_start(), draft_duration())),
                    "{t.schedule.apply}"
                }
            }
        }
    }
}

/// 메타 행의 '시간' 값 — '09:00 – 09:30 · 30분'
#[component]
pub fn ScheduleValue(start_at: String, duration_min: i64) -> Element {
    let t = use_app().t;
    rsx! {
        HStack { gap: Gap::Sm,
            Text { variant: TextVariant::Numeric, "{start_at} – {end_time(&start_at, duration_min)}" }
            Text { variant: TextVariant::Caption, tone: TextTone::Tertiary,
                "{format_duration(&t, duration_min)}" }
        }
    }
}

/// 메타 행의 '프로젝트' 값 — 색 점 + 이름, 없으면 '프로젝트 없음'
#[component]
pub fn ProjectValue(
    #[props(default)] name: Option<String>,
    #[props(default)] color: Option<ProjectColor>,
) -> Element {
    let t = use_app().t;
    let label = name.clone().unwrap_or_else(|| t.common.no_project.as_str().to_owned());
    let tone = if name.is_none() { TextTone::Tertiary } else { TextTone::Default };
    rsx! {
        HStack { gap: Gap::Sm,
            if let Some(color) = color {
                Dot { size: DotSize::Sm, tone: DotTone::from(color) }
            }
            Text { variant: TextVariant::BodyStrong, tone, truncate: true, "{label}" }
        }
    }
}

/// 제목 입력은 인라인 variant를 쓴다 — 화면 상단의 큰 제목처럼 보이게 한다
pub const TITLE_INPUT_VARIANT: InputVariant = InputVariant::Inline;
