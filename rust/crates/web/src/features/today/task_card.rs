use dioxus::prelude::*;
use tooday_shared::{Project, Task, TaskStatus};

use crate::app::hooks::use_app;
use crate::shared::ui::icons;
use crate::shared::ui::{
    BaseButton, Card, CardPadding, Dot, DotSize, DotTone, Gap, HStack, Text, TextTag, TextTone, TextVariant,
};

#[component]
pub fn TaskCard(
    task: Task,
    project: Option<Project>,
    ontoggle: EventHandler<Task>,
    onopen: EventHandler<()>,
) -> Element {
    let t = use_app().t;
    let is_done = task.status == TaskStatus::Done;
    let tone = if is_done { TextTone::Tertiary } else { TextTone::Default };
    let dot_tone = project.as_ref().map(|project| DotTone::from(project.color)).unwrap_or(DotTone::Gray);
    let project_name = project.as_ref().map(|project| project.name.clone()).unwrap_or_else(|| "—".into());
    let toggle_task = task.clone();

    rsx! {
        Card {
            padding: CardPadding::Md,
            selected: task.status == TaskStatus::Doing,
            class: "task-card",
            BaseButton { class: "task-card-body", onclick: move |_| onopen.call(()),
                Text {
                    tag: TextTag::H3,
                    variant: TextVariant::Subtitle,
                    tone,
                    truncate: true,
                    strike: is_done,
                    "{task.title}"
                }
                HStack { gap: Gap::Sm,
                    Dot { size: DotSize::Sm, tone: dot_tone }
                    Text { variant: TextVariant::Caption, tone: TextTone::Tertiary, "{project_name}" }
                }
            }
            button {
                r#type: "button",
                class: "base-button task-card-check",
                "data-status": task.status.as_str(),
                "aria-label": t.today.toggle_done.as_str(),
                "aria-pressed": is_done.to_string(),
                onclick: move |_| ontoggle.call(toggle_task.clone()),
                match task.status {
                    TaskStatus::Done => rsx! { span { dangerous_inner_html: icons::check(14) } },
                    TaskStatus::Doing => rsx! { span { dangerous_inner_html: icons::loader_circle(14) } },
                    TaskStatus::Todo => rsx! {},
                }
            }
        }
    }
}
