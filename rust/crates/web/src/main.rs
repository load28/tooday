//! 웹 진입점 — TS `apps/web/src/router.tsx` + 앱 셸 대응.
//!
//! locale과 사전을 요청 스코프에서 한 번 결정해 컨텍스트로 내려준다 —
//! 전역 가변 상태가 없어 화면끼리 locale이 섞이지 않는다.

use dioxus::prelude::*;

use tooday_web::app::hooks::AppContext;
use tooday_web::routes::Route;
use tooday_web::shared::i18n::{resolve_locale, Locale};

const APP_CSS: Asset = asset!("/assets/app.css");

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let locale = use_hook(browser_locale);
    use_context_provider(|| AppContext::new(locale));

    rsx! {
        document::Link { rel: "stylesheet", href: APP_CSS }
        // 캐스케이드 레이어 순서 확정 — reset < base < base-recipe < recipes < 레이어 없음.
        // 스타일시트 주입 순서와 무관하게 base-button이 컴포넌트 recipe에 지고,
        // 1회성 화면 스타일이 recipe를 이긴다.
        document::Style { {"@layer reset, base, base-recipe, recipes;"} }
        document::Meta {
            name: "viewport",
            content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
        }
        document::Meta { name: "apple-mobile-web-app-capable", content: "yes" }
        document::Meta { name: "mobile-web-app-capable", content: "yes" }
        document::Meta { name: "apple-mobile-web-app-status-bar-style", content: "default" }
        document::Meta { name: "format-detection", content: "telephone=no, email=no, address=no" }
        document::Title { "TooDay" }
        Router::<Route> {}
    }
}

/// navigator.language에서 지원 locale을 고른다
fn browser_locale() -> Locale {
    #[cfg(target_arch = "wasm32")]
    {
        let language = web_sys::window().and_then(|window| window.navigator().language());
        resolve_locale(language.as_deref())
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        resolve_locale(None)
    }
}
