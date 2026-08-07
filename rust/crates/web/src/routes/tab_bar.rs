//! today/projects 하단 내비 프리셋 — feature 간 내비게이션 조립이므로 배선 층(routes)이
//! 소유하고, 탭 레이아웃이 푸터에 한 번만 렌더한다.
//!
//! 활성 탭은 현재 경로에서 파생한다 — 레이아웃 한 곳에서만 렌더되므로 각 화면이 같은
//! 사실을 prop으로 넘길 이유가 없다. `/projects/:id`는 projects가 활성이다.
//!
//! 탭을 누르면 해당 탭의 루트로 이동한다 — 이미 그 화면이면 아무것도 하지 않는다
//! (예: 프로젝트 상세에서 projects 탭을 누르면 목록으로 올라간다).

use dioxus::prelude::*;

use crate::app::hooks::use_app;
use crate::shared::ui::icons;
use crate::shared::ui::{TabBar, TabItem};

const TAB_PATHS: [(&str, &str); 2] = [("today", "/today"), ("projects", "/projects")];

fn tab_path(key: &str) -> &'static str {
    TAB_PATHS.iter().find_map(|(candidate, path)| (*candidate == key).then_some(*path)).unwrap_or("/today")
}

fn active_tab(pathname: &str) -> &'static str {
    TAB_PATHS.iter().find_map(|(key, path)| pathname.starts_with(path).then_some(*key)).unwrap_or("today")
}

#[component]
pub fn AppTabBar() -> Element {
    let t = use_app().t;
    let route = use_route::<crate::routes::Route>();
    let pathname = route.to_string();
    let active = active_tab(&pathname);

    rsx! {
        TabBar {
            aria_label: t.nav.label.as_str().to_owned(),
            active_key: active.to_owned(),
            items: vec![
                TabItem {
                    key: "today",
                    label: t.nav.today.as_str().to_owned(),
                    icon: Box::leak(icons::calendar_days(22).into_boxed_str()),
                },
                TabItem {
                    key: "projects",
                    label: t.nav.projects.as_str().to_owned(),
                    icon: Box::leak(icons::layout_grid(22).into_boxed_str()),
                },
            ],
            onselect: move |key: &'static str| {
                let target = tab_path(key);
                if pathname != target {
                    navigator().push(target.to_owned());
                }
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 경로에서_활성_탭을_파생한다() {
        assert_eq!(active_tab("/today"), "today");
        assert_eq!(active_tab("/projects"), "projects");
        // 프로젝트 상세도 projects 탭이 활성이다
        assert_eq!(active_tab("/projects/abc"), "projects");
        // 탭 밖 화면은 today로 떨어진다
        assert_eq!(active_tab("/settings"), "today");
    }

    #[test]
    fn 탭_키가_경로로_매핑된다() {
        assert_eq!(tab_path("today"), "/today");
        assert_eq!(tab_path("projects"), "/projects");
    }
}
