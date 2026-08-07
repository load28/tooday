//! 도메인 무관 디자인 시스템 프리미티브 (Dioxus).
//!
//! 조립 규칙(docs/conventions/ui-composition.md): 인터랙티브 컴포넌트는 베이스 버튼
//! [`BaseButton`] 위에 얹는다. recipe가 관리하는 속성은 class로 덮지 않고 variant prop
//! (`data-*`)으로 지정한다(docs/conventions/ui-styling.md).

use dioxus::prelude::*;

use super::tokens::*;

/// 브라우저 기본 버튼 스타일을 걷어낸 베이스 — 다른 프리미티브가 이 위에 얹는다.
#[component]
pub fn BaseButton(
    #[props(default)] class: String,
    #[props(default)] aria_label: Option<String>,
    #[props(default)] aria_pressed: Option<bool>,
    #[props(default)] disabled: bool,
    #[props(default)] onclick: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    rsx! {
        button {
            r#type: "button",
            class: "base-button {class}",
            disabled,
            "aria-label": aria_label,
            "aria-pressed": aria_pressed.map(|pressed| pressed.to_string()),
            onclick: move |event| {
                if let Some(handler) = &onclick {
                    handler.call(event);
                }
            },
            {children}
        }
    }
}

#[component]
pub fn Button(
    #[props(default)] tone: ButtonTone,
    #[props(default)] size: ButtonSize,
    #[props(default)] shape: ButtonShape,
    #[props(default)] full_width: bool,
    #[props(default)] loading: bool,
    #[props(default)] disabled: bool,
    #[props(default)] submit: bool,
    #[props(default)] aria_label: Option<String>,
    #[props(default)] class: String,
    #[props(default)] onclick: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    rsx! {
        button {
            r#type: if submit { "submit" } else { "button" },
            class: "base-button button {class}",
            "data-tone": tone.as_str(),
            "data-size": size.as_str(),
            "data-shape": shape.as_str(),
            "data-full-width": flag(full_width),
            "data-loading": flag(loading),
            // 진행 중에는 중복 제출을 막는다 — 로딩은 곧 비활성이다
            disabled: disabled || loading,
            "aria-label": aria_label,
            onclick: move |event| {
                if let Some(handler) = &onclick {
                    handler.call(event);
                }
            },
            if loading {
                Spinner {}
            }
            {children}
        }
    }
}

#[component]
pub fn Spinner() -> Element {
    rsx! { span { class: "spinner", "aria-hidden": "true" } }
}

#[component]
pub fn Card(
    #[props(default)] radius: CardRadius,
    #[props(default)] padding: CardPadding,
    #[props(default)] interactive: bool,
    #[props(default)] selected: bool,
    #[props(default)] class: String,
    #[props(default)] onclick: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    let attributes = rsx! {
        {children}
    };
    // 누를 수 있는 카드는 button으로 — 키보드 접근성이 공짜로 따라온다
    if interactive {
        rsx! {
            button {
                r#type: "button",
                class: "base-button card {class}",
                "data-radius": radius.as_str(),
                "data-padding": padding.as_str(),
                "data-interactive": flag(true),
                "data-selected": flag(selected),
                onclick: move |event| {
                    if let Some(handler) = &onclick {
                        handler.call(event);
                    }
                },
                {attributes}
            }
        }
    } else {
        rsx! {
            div {
                class: "card {class}",
                "data-radius": radius.as_str(),
                "data-padding": padding.as_str(),
                "data-selected": flag(selected),
                {attributes}
            }
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum TextTag {
    #[default]
    Span,
    H1,
    H3,
    P,
}

#[component]
pub fn Text(
    #[props(default)] variant: TextVariant,
    #[props(default)] tone: TextTone,
    #[props(default)] tag: TextTag,
    #[props(default)] truncate: bool,
    #[props(default)] strike: bool,
    #[props(default)] center: bool,
    #[props(default)] class: String,
    children: Element,
) -> Element {
    let common = rsx! { {children} };
    let variant = variant.as_str();
    let tone = tone.as_str();
    let truncate = flag(truncate);
    let strike = flag(strike);
    let align = center.then_some("center");
    match tag {
        TextTag::Span => rsx! {
            span { class: "text {class}", "data-variant": variant, "data-tone": tone,
                "data-truncate": truncate, "data-strike": strike, "data-align": align, {common} }
        },
        TextTag::H1 => rsx! {
            h1 { class: "text {class}", "data-variant": variant, "data-tone": tone,
                "data-truncate": truncate, "data-strike": strike, "data-align": align, {common} }
        },
        TextTag::H3 => rsx! {
            h3 { class: "text {class}", "data-variant": variant, "data-tone": tone,
                "data-truncate": truncate, "data-strike": strike, "data-align": align, {common} }
        },
        TextTag::P => rsx! {
            p { class: "text {class}", "data-variant": variant, "data-tone": tone,
                "data-truncate": truncate, "data-strike": strike, "data-align": align, {common} }
        },
    }
}

#[component]
pub fn Stack(
    #[props(default)] gap: Gap,
    #[props(default)] center: bool,
    #[props(default)] class: String,
    children: Element,
) -> Element {
    rsx! {
        div { class: "stack {class}", "data-gap": gap.as_str(), "data-align": center.then_some("center"),
            {children}
        }
    }
}

#[component]
pub fn HStack(
    #[props(default)] gap: Gap,
    #[props(default)] justify_center: bool,
    #[props(default)] class: String,
    children: Element,
) -> Element {
    rsx! {
        div { class: "hstack {class}", "data-gap": gap.as_str(),
            "data-justify": justify_center.then_some("center"), {children} }
    }
}

/// 좌측 leading · 본문 · 우측 trailing 세 슬롯의 한 줄
#[component]
pub fn Row(
    #[props(default)] leading: Option<Element>,
    #[props(default)] trailing: Option<Element>,
    #[props(default)] interactive: bool,
    #[props(default)] flush: bool,
    #[props(default)] class: String,
    #[props(default)] onclick: Option<EventHandler<MouseEvent>>,
    children: Element,
) -> Element {
    let inner = rsx! {
        if let Some(leading) = leading {
            span { class: "row-leading", {leading} }
        }
        span { class: "row-content", {children} }
        if let Some(trailing) = trailing {
            span { class: "row-trailing", {trailing} }
        }
    };
    let inset = flush.then_some("flush");
    if interactive {
        rsx! {
            button {
                r#type: "button",
                class: "base-button row {class}",
                "data-interactive": flag(true),
                "data-inset": inset,
                onclick: move |event| {
                    if let Some(handler) = &onclick {
                        handler.call(event);
                    }
                },
                {inner}
            }
        }
    } else {
        rsx! { div { class: "row {class}", "data-inset": inset, {inner} } }
    }
}

#[component]
pub fn Divider() -> Element {
    rsx! { hr { class: "divider" } }
}

#[component]
pub fn Dot(#[props(default)] size: DotSize, #[props(default)] tone: DotTone) -> Element {
    rsx! {
        span { class: "dot", "data-size": size.as_str(), "data-tone": tone.as_str(), "aria-hidden": "true" }
    }
}

#[component]
pub fn Chip(
    #[props(default)] tone: ChipTone,
    #[props(default)] size: ChipSize,
    #[props(default)] leading: Option<Element>,
    children: Element,
) -> Element {
    rsx! {
        span { class: "chip", "data-tone": tone.as_str(), "data-size": size.as_str(),
            if let Some(leading) = leading {
                span { class: "chip-leading", {leading} }
            }
            {children}
        }
    }
}

/// 진행률 막대 — value는 0..=1
#[component]
pub fn ProgressBar(value: f64, #[props(default)] tone: DotTone) -> Element {
    let percent = (value.clamp(0.0, 1.0) * 100.0).round();
    rsx! {
        div {
            class: "progress-bar",
            role: "progressbar",
            "aria-valuenow": "{percent}",
            "aria-valuemin": "0",
            "aria-valuemax": "100",
            div { class: "progress-bar-fill", "data-tone": tone.as_str(), style: "width: {percent}%" }
        }
    }
}

#[component]
pub fn Section(title: String, children: Element) -> Element {
    rsx! {
        section { class: "section",
            h2 { class: "section-title text", "data-variant": "label", "data-tone": "tertiary", "{title}" }
            {children}
        }
    }
}

#[component]
pub fn Surface(#[props(default)] class: String, children: Element) -> Element {
    rsx! { div { class: "surface {class}", {children} } }
}
