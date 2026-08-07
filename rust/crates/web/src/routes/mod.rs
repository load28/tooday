//! 라우트 — 배선만 한다 (가드·리다이렉트·화면 연결).
//!
//! TS는 TanStack 파일 라우팅의 pathless 레이아웃(`_app` / `_public` / `_tabs`)으로
//! 가드와 셸을 표현했다. 여기서는 [`Route`] 열거형이 URL을 소유하고, 같은 규칙을
//! [`AppGate`]/[`PublicGate`] 컴포넌트와 [`TabsLayout`]이 담당한다.

pub mod tab_bar;

use chrono::Local;
use dioxus::prelude::*;

use crate::app::hooks::use_app;
use crate::app::trpc::fetch_session_user;
use crate::features::auth::login_screen::LoginScreen;
use crate::features::auth::settings_screen::SettingsScreen;
use crate::features::auth::signup_screen::SignupScreen;
use crate::features::projects::new_project_sheet::NewProjectSheet;
use crate::features::projects::project_detail_screen::ProjectDetailScreen;
use crate::features::projects::projects_screen::ProjectsScreen;
use crate::features::tasks::new_task_screen::NewTaskScreen;
use crate::features::tasks::task_detail_screen::TaskDetailScreen;
use crate::features::today::today_screen::TodayScreen;
use crate::routes::tab_bar::AppTabBar;
use crate::shared::ui::{Gap, Stack, Text, TextTag, TextTone, TextVariant};

#[derive(Routable, Clone, PartialEq, Debug)]
#[rustfmt::skip]
pub enum Route {
    // 진입점 — 세션 유무로 /today 또는 /login으로 보낸다
    #[route("/")]
    Index {},

    // 탭바를 갖는 화면들
    #[route("/today")]
    Today {},
    #[route("/projects")]
    Projects {},
    #[route("/projects/:project_id")]
    ProjectDetail { project_id: String },

    // 탭바가 없는 풀스크린 — push 화면으로 뜨고 앱바의 back으로 돌아간다
    #[route("/tasks/new")]
    NewTask {},
    #[route("/tasks/:task_id")]
    TaskDetail { task_id: String },
    #[route("/settings")]
    Settings {},

    // 공개 화면 — 이미 로그인했으면 앱으로 돌려보낸다
    #[route("/login")]
    Login {},
    #[route("/signup")]
    Signup {},

    #[route("/:..segments")]
    NotFound { segments: Vec<String> },
}

/// 가드가 세션을 확인하는 동안의 상태. 확인 전에 화면을 그리면 로그인 화면이
/// 잠깐 번쩍이므로, 판정이 끝날 때까지 아무것도 그리지 않는다.
#[derive(Clone, Copy, PartialEq, Eq)]
enum SessionState {
    Checking,
    SignedIn,
    Anonymous,
}

fn use_session() -> SessionState {
    let app = use_app();
    let session = use_resource(move || {
        let app = app.clone();
        async move { fetch_session_user(&app.trpc).await.is_some() }
    });
    // read()의 임시 참조가 match 밖으로 새지 않도록 값으로 복사한다
    let resolved: Option<bool> = *session.read();
    match resolved {
        None => SessionState::Checking,
        Some(true) => SessionState::SignedIn,
        Some(false) => SessionState::Anonymous,
    }
}

fn navigate(path: String) {
    let navigator = navigator();
    navigator.push(path);
}

/// 인증이 필요한 화면의 게이트 — 익명이면 로그인으로 보낸다.
#[component]
fn AppGate(children: Element) -> Element {
    match use_session() {
        SessionState::Checking => rsx! { Loading {} },
        SessionState::SignedIn => rsx! { {children} },
        SessionState::Anonymous => {
            navigate("/login".into());
            rsx! {}
        }
    }
}

/// 공개 화면의 게이트 — 이미 로그인했으면 앱으로 보낸다.
#[component]
fn PublicGate(children: Element) -> Element {
    match use_session() {
        SessionState::Checking => rsx! { Loading {} },
        SessionState::Anonymous => rsx! { {children} },
        SessionState::SignedIn => {
            navigate("/".into());
            rsx! {}
        }
    }
}

#[component]
fn Loading() -> Element {
    let t = use_app().t;
    rsx! {
        div { class: "screen",
            main { class: "screen-content",
                Stack { center: true, gap: Gap::Sm,
                    Text { variant: TextVariant::BodySm, tone: TextTone::Tertiary, "{t.common.loading}" }
                }
            }
        }
    }
}

/// 하단 탭 내비를 갖는 화면들의 셸. 뷰포트와 푸터(탭바)를 이 레이아웃이 소유해
/// 탭 전환에도 탭바가 그대로 살아남는다 — 본문만 교체된다.
///
/// 스크롤 컨테이너(`screen-content`)는 각 화면이 소유한다 — 여기로 올리면 탭 간
/// 스크롤 위치가 공유된다.
#[component]
fn TabsLayout(children: Element) -> Element {
    rsx! {
        div { class: "screen",
            {children}
            footer { class: "screen-footer",
                AppTabBar {}
            }
        }
    }
}

/// 오늘 날짜를 한 번 고정해 내려준다 — 렌더마다 오늘이 흔들리지 않게 한다.
fn today() -> chrono::NaiveDate {
    Local::now().date_naive()
}

#[component]
pub fn Index() -> Element {
    match use_session() {
        SessionState::Checking => rsx! { Loading {} },
        SessionState::SignedIn => {
            navigate("/today".into());
            rsx! {}
        }
        SessionState::Anonymous => {
            navigate("/login".into());
            rsx! {}
        }
    }
}

#[component]
pub fn Today() -> Element {
    let now = use_hook(today);
    rsx! {
        AppGate {
            TabsLayout {
                TodayScreen { now, onnavigate: move |path: String| navigate(path) }
            }
        }
    }
}

#[component]
pub fn Projects() -> Element {
    rsx! {
        AppGate {
            TabsLayout {
                ProjectsScreen { onnavigate: move |path: String| navigate(path) }
            }
        }
    }
}

#[component]
pub fn ProjectDetail(project_id: String) -> Element {
    rsx! {
        AppGate {
            TabsLayout {
                ProjectDetailScreen {
                    project_id,
                    onnavigate: move |path: String| navigate(path),
                    onback: move |_| { navigator().go_back(); },
                }
            }
        }
    }
}

#[component]
pub fn NewTask() -> Element {
    let now = use_hook(today);
    // tasks ↔ projects feature 조립은 라우트(배선 층)가 담당한다 — feature 간 직접 import 금지
    let mut sheet_open = use_signal(|| false);
    let mut created_project = use_signal(|| None::<String>);
    rsx! {
        AppGate {
            NewTaskScreen {
                now,
                onnavigate: move |path: String| navigate(path),
                onback: move |_| { navigator().go_back(); },
                onrequest_new_project: move |_| sheet_open.set(true),
                new_project_sheet: rsx! {
                    NewProjectSheet {
                        open: sheet_open(),
                        onclose: move |_| sheet_open.set(false),
                        oncreated: move |project: tooday_shared::Project| {
                            created_project.set(Some(project.id));
                            sheet_open.set(false);
                        },
                    }
                },
            }
        }
    }
}

#[component]
pub fn TaskDetail(task_id: String) -> Element {
    rsx! {
        AppGate {
            TaskDetailScreen {
                task_id,
                onnavigate: move |path: String| navigate(path),
                onback: move |_| { navigator().go_back(); },
            }
        }
    }
}

#[component]
pub fn Settings() -> Element {
    rsx! {
        AppGate {
            SettingsScreen {
                onnavigate: move |path: String| navigate(path),
                onback: move |_| { navigator().go_back(); },
            }
        }
    }
}

#[component]
pub fn Login() -> Element {
    rsx! {
        PublicGate {
            LoginScreen { onnavigate: move |path: String| navigate(path) }
        }
    }
}

#[component]
pub fn Signup() -> Element {
    rsx! {
        PublicGate {
            SignupScreen { onnavigate: move |path: String| navigate(path) }
        }
    }
}

#[component]
pub fn NotFound(segments: Vec<String>) -> Element {
    let t = use_app().t;
    let _ = segments;
    rsx! {
        div { class: "screen",
            main { class: "screen-content",
                Stack { center: true, gap: Gap::Sm,
                    Text { tag: TextTag::H1, variant: TextVariant::Display, "{t.not_found.code}" }
                    Text { variant: TextVariant::Body, tone: TextTone::Tertiary, "{t.not_found.message}" }
                }
            }
        }
    }
}
