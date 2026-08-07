//! 화면 골격 — Screen / AppBar / TabBar / BottomSheet.

use dioxus::prelude::*;

use super::tokens::flag;

/// 뷰포트 하나를 채우는 셸. 헤더·본문·푸터 슬롯을 갖는다 —
/// 스크롤 컨테이너는 본문(`screen-content`)이 소유한다.
#[component]
pub fn Screen(
    #[props(default)] top_bar: Option<Element>,
    #[props(default)] footer: Option<Element>,
    children: Element,
) -> Element {
    rsx! {
        div { class: "screen",
            if let Some(top_bar) = top_bar {
                header { class: "screen-header", {top_bar} }
            }
            main { class: "screen-content", {children} }
            if let Some(footer) = footer {
                footer { class: "screen-footer", {footer} }
            }
        }
    }
}

#[component]
pub fn AppBar(
    #[props(default)] leading: Option<Element>,
    #[props(default)] trailing: Option<Element>,
    title: String,
) -> Element {
    rsx! {
        div { class: "app-bar",
            div { class: "app-bar-leading",
                if let Some(leading) = leading {
                    {leading}
                }
            }
            h1 { class: "app-bar-title text", "data-variant": "title", "data-truncate": "true", "{title}" }
            div { class: "app-bar-trailing",
                if let Some(trailing) = trailing {
                    {trailing}
                }
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct TabItem {
    pub key: &'static str,
    pub label: String,
    /// 인라인 SVG 아이콘 마크업
    pub icon: &'static str,
}

#[component]
pub fn TabBar(
    items: Vec<TabItem>,
    active_key: String,
    aria_label: String,
    onselect: EventHandler<&'static str>,
) -> Element {
    rsx! {
        nav { class: "tab-bar", "aria-label": "{aria_label}",
            for item in items {
                button {
                    key: "{item.key}",
                    r#type: "button",
                    class: "base-button tab-bar-item",
                    "data-active": flag(item.key == active_key),
                    "aria-current": (item.key == active_key).then_some("page"),
                    onclick: move |_| onselect.call(item.key),
                    span { class: "tab-bar-icon", dangerous_inner_html: item.icon }
                    span { class: "tab-bar-label", "{item.label}" }
                }
            }
        }
    }
}

/// 바텀시트 — 닫히면 언마운트된다(TS의 lazyMount). 그래서 다시 열 때 내부 초안이
/// 새로 초기화되고 별도 리셋이 필요 없다.
#[component]
pub fn BottomSheet(
    open: bool,
    aria_label: String,
    onclose: EventHandler<()>,
    #[props(default)] title: Option<String>,
    #[props(default)] description: Option<String>,
    children: Element,
) -> Element {
    if !open {
        return rsx! {};
    }
    rsx! {
        div { class: "sheet-backdrop", onclick: move |_| onclose.call(()),
            div {
                class: "sheet",
                role: "dialog",
                "aria-modal": "true",
                "aria-label": "{aria_label}",
                // 시트 안 클릭이 배경으로 새어 나가 닫히지 않게 한다
                onclick: move |event| event.stop_propagation(),
                div { class: "sheet-handle", "aria-hidden": "true" }
                if title.is_some() || description.is_some() {
                    div { class: "sheet-header",
                        if let Some(title) = title {
                            h2 { class: "sheet-title text", "data-variant": "title", "{title}" }
                        }
                        if let Some(description) = description {
                            p { class: "sheet-description text", "data-variant": "bodySm", "data-tone": "tertiary",
                                "{description}" }
                        }
                    }
                }
                div { class: "sheet-body", {children} }
            }
        }
    }
}
