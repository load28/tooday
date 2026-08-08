//! 웹 진입점 — TS `apps/web/src/router.tsx` + 앱 셸 대응.
//!
//! locale과 사전을 요청 스코프에서 한 번 결정해 컨텍스트로 내려준다 —
//! 전역 가변 상태가 없어 화면끼리 locale이 섞이지 않는다.

use dioxus::prelude::*;

use tooday_web::app::hooks::AppContext;
use tooday_web::routes::Route;
use tooday_web::shared::i18n::{resolve_locale, Locale};

fn main() {
    // 패닉을 콘솔에 원문으로 남긴다 — 없으면 wasm에서 `unreachable`로만 보인다
    #[cfg(target_arch = "wasm32")]
    console_error_panic_hook::set_once();
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let locale = use_hook(browser_locale);
    use_context_provider(|| AppContext::new(locale));

    // 스타일시트·메타·레이어 순서는 index.html이 소유한다 — CSR이라 셸이 먼저 뜨고
    // wasm이 그 위에 마운트되므로, 첫 페인트에 스타일이 이미 붙어 있어야 한다.
    rsx! {
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
