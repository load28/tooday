use dioxus::prelude::*;
use tooday_shared::MeResponse;

use crate::app::api::me_key;
use crate::app::hooks::{use_app, use_cached_query};
use crate::features::today::today_screen::IconButton;
use crate::shared::ui::icons;
use crate::shared::ui::{
    AppBar, BottomSheet, Button, ButtonSize, ButtonTone, Gap, Stack, Text, TextTone, TextVariant,
};

#[component]
pub fn SettingsScreen(onnavigate: EventHandler<String>, onback: EventHandler<()>) -> Element {
    let app = use_app();
    let t = app.t;
    let mut confirm_open = use_signal(|| false);
    let mut logging_out = use_signal(|| false);
    let mut logout_failed = use_signal(|| false);

    let query =
        use_cached_query::<MeResponse, _, _>(me_key(), move |client| async move { client.me().await });
    let _ = query.read();
    let email = app
        .cached::<MeResponse>(&me_key())
        .and_then(|response| response.user)
        .map(|user| user.email)
        .unwrap_or_default();

    // 시트 배경 클릭과 취소 버튼이 같은 규칙을 공유한다
    let mut close_confirm = move || {
        // 진행 중엔 시트를 닫지 않는다
        if logging_out() {
            return;
        }
        // 재오픈 시 이전 에러가 남지 않게 리셋
        logout_failed.set(false);
        confirm_open.set(false);
    };

    let logout = {
        let app = app.clone();
        move |_| {
            logging_out.set(true);
            logout_failed.set(false);
            let app = app.clone();
            spawn(async move {
                match app.trpc.logout().await {
                    Ok(_) => {
                        confirm_open.set(false);
                        logging_out.set(false);
                        // 웹뷰는 새로고침으로 리셋되지 않는다 — 이전 유저 데이터가 남지 않게
                        // 전 캐시를 비운다.
                        app.trpc.query_client.clear();
                        onnavigate.call("/login".into());
                    }
                    Err(_) => {
                        logging_out.set(false);
                        logout_failed.set(true);
                    }
                }
            });
        }
    };

    rsx! {
        div { class: "screen",
            header { class: "screen-header",
                AppBar {
                    title: t.settings.title.as_str().to_owned(),
                    leading: rsx! {
                        IconButton { icon: icons::chevron_left(22), label: t.common.back.as_str().to_owned(),
                            onclick: move |_| onback.call(()) }
                    },
                }
            }
            main { class: "screen-content",
                div { class: "settings-page",
                    Stack { gap: Gap::Xs,
                        Text { variant: TextVariant::Label, tone: TextTone::Tertiary,
                            "{t.settings.account.label}" }
                        Text { variant: TextVariant::Body, "{email}" }
                    }
                    div { class: "settings-logout-slot",
                        Button {
                            tone: ButtonTone::Danger,
                            size: ButtonSize::Xl,
                            full_width: true,
                            onclick: move |_| confirm_open.set(true),
                            "{t.settings.logout.action}"
                        }
                    }
                }
            }
        }

        BottomSheet {
            open: confirm_open(),
            aria_label: t.settings.logout.confirm_title.as_str().to_owned(),
            title: t.settings.logout.confirm_title.as_str().to_owned(),
            description: t.settings.logout.confirm_description.as_str().to_owned(),
            onclose: move |_| close_confirm(),
            Stack { gap: Gap::Md, class: "sheet-actions",
                if logout_failed() {
                    Text { variant: TextVariant::BodySm, tone: TextTone::Danger, center: true,
                        "{t.settings.logout.error}" }
                }
                Button {
                    tone: ButtonTone::Danger,
                    size: ButtonSize::Xl,
                    full_width: true,
                    loading: logging_out(),
                    onclick: logout,
                    "{t.settings.logout.confirm}"
                }
                Button {
                    tone: ButtonTone::Ghost,
                    size: ButtonSize::Xl,
                    full_width: true,
                    disabled: logging_out(),
                    onclick: move |_| close_confirm(),
                    "{t.settings.logout.cancel}"
                }
            }
        }
    }
}
