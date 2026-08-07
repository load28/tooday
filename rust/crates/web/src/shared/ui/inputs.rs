//! 입력 계열 프리미티브 — Input / Field / TextField / ColorSwatchGroup.

use dioxus::prelude::*;

use super::tokens::*;

#[component]
pub fn Input(
    value: String,
    #[props(default)] variant: InputVariant,
    #[props(default)] size: InputSize,
    #[props(default)] input_type: Option<String>,
    #[props(default)] name: Option<String>,
    #[props(default)] placeholder: Option<String>,
    #[props(default)] aria_label: Option<String>,
    #[props(default)] autocomplete: Option<String>,
    #[props(default)] inputmode: Option<String>,
    #[props(default)] autofocus: bool,
    #[props(default)] invalid: bool,
    #[props(default)] step: Option<i64>,
    #[props(default)] oninput: Option<EventHandler<String>>,
    #[props(default)] onblur: Option<EventHandler<()>>,
    #[props(default)] onkeydown: Option<EventHandler<KeyboardEvent>>,
) -> Element {
    rsx! {
        input {
            class: "input",
            "data-variant": variant.as_str(),
            "data-size": size.as_str(),
            "data-invalid": flag(invalid),
            "aria-invalid": flag(invalid),
            r#type: input_type.unwrap_or_else(|| "text".into()),
            name,
            placeholder,
            "aria-label": aria_label,
            autocomplete,
            inputmode,
            autofocus,
            step: step.map(|step| step.to_string()),
            value,
            oninput: move |event| {
                if let Some(handler) = &oninput {
                    handler.call(event.value());
                }
            },
            onblur: move |_| {
                if let Some(handler) = &onblur {
                    handler.call(());
                }
            },
            onkeydown: move |event| {
                if let Some(handler) = &onkeydown {
                    handler.call(event);
                }
            },
        }
    }
}

/// 라벨 + 컨트롤 + 에러 문구를 묶는 폼 필드 껍데기
#[component]
pub fn Field(label: String, #[props(default)] error: Option<String>, children: Element) -> Element {
    rsx! {
        label { class: "field",
            span { class: "field-label text", "data-variant": "label", "data-tone": "secondary", "{label}" }
            {children}
            if let Some(error) = error {
                span { class: "field-error text", "data-variant": "bodySm", "data-tone": "danger", "{error}" }
            }
        }
    }
}

/// Field + Input 조합 — 폼에서 가장 흔한 한 벌
#[component]
#[allow(clippy::too_many_arguments)]
pub fn TextField(
    label: String,
    value: String,
    #[props(default)] size: InputSize,
    #[props(default)] input_type: Option<String>,
    #[props(default)] name: Option<String>,
    #[props(default)] placeholder: Option<String>,
    #[props(default)] autocomplete: Option<String>,
    #[props(default)] inputmode: Option<String>,
    #[props(default)] autofocus: bool,
    #[props(default)] error: Option<String>,
    #[props(default)] oninput: Option<EventHandler<String>>,
    #[props(default)] onblur: Option<EventHandler<()>>,
) -> Element {
    let invalid = error.is_some();
    rsx! {
        Field { label, error,
            Input {
                value,
                size,
                input_type,
                name,
                placeholder,
                autocomplete,
                inputmode,
                autofocus,
                invalid,
                oninput,
                onblur,
            }
        }
    }
}

/// 색상 선택 그룹 — 단일 선택. 선택 상태는 `data-selected`로 표시한다.
#[component]
pub fn ColorSwatchGroup(
    #[props(default)] aria_label: Option<String>,
    #[props(default)] class: String,
    children: Element,
) -> Element {
    rsx! {
        div { class: "color-swatch-group {class}", role: "radiogroup", "aria-label": aria_label, {children} }
    }
}

#[component]
pub fn ColorSwatch(
    tone: DotTone,
    selected: bool,
    #[props(default)] aria_label: Option<String>,
    #[props(default)] onclick: Option<EventHandler<MouseEvent>>,
) -> Element {
    rsx! {
        button {
            r#type: "button",
            role: "radio",
            class: "base-button color-swatch",
            "data-tone": tone.as_str(),
            "data-selected": flag(selected),
            "aria-checked": selected.to_string(),
            "aria-label": aria_label,
            onclick: move |event| {
                if let Some(handler) = &onclick {
                    handler.call(event);
                }
            },
            if selected {
                span { class: "color-swatch-indicator", "aria-hidden": "true", "✓" }
            }
        }
    }
}
