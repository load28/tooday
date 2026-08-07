use dioxus::prelude::*;
use tooday_shared::validate::IssueKind;
use tooday_shared::{LoginRequest, MeResponse};

use crate::app::api::me_key;
use crate::app::hooks::use_app;
use crate::app::trpc::TrpcErrorCode;
use crate::shared::form::{has_trpc_error_code, validate, FormErrors, FormMessages};
use crate::shared::ui::{
    Button, ButtonSize, ButtonTone, Gap, HStack, InputSize, Stack, Text, TextField, TextTag, TextTone,
    TextVariant,
};

#[component]
pub fn LoginScreen(onnavigate: EventHandler<String>) -> Element {
    let app = use_app();
    let t = app.t;
    let mut email = use_signal(String::new);
    let mut password = use_signal(String::new);
    let mut errors = use_signal(FormErrors::default);
    let mut submitting = use_signal(|| false);

    let messages = FormMessages::new()
        .on("email", IssueKind::MinLength, t.auth.login.email_required.as_str())
        .on("password", IssueKind::MinLength, t.auth.login.password_required.as_str());

    let submit = move |event: FormEvent| {
        event.prevent_default();
        let app = app.clone();
        let request = LoginRequest { email: email(), password: password() };
        let parsed = match validate(request, &messages) {
            Ok(parsed) => parsed,
            Err(invalid) => {
                errors.set(invalid);
                return;
            }
        };
        errors.set(FormErrors::default());
        submitting.set(true);
        spawn(async move {
            match app.trpc.login(&parsed).await {
                Ok(response) => {
                    // 게이트가 곧바로 통과하도록 세션 캐시를 직접 채운다
                    app.trpc
                        .query_client
                        .set_query_data(&me_key(), &MeResponse { user: Some(response.user) });
                    submitting.set(false);
                    onnavigate.call("/today".into());
                }
                Err(error) => {
                    submitting.set(false);
                    errors.set(if has_trpc_error_code(&error, TrpcErrorCode::Unauthorized) {
                        FormErrors::default()
                            .with_field("password", t.auth.login.invalid_credentials.as_str())
                    } else {
                        FormErrors::default().with_form(t.common.error.unexpected.as_str())
                    });
                }
            }
        });
    };

    rsx! {
        div { class: "screen",
            main { class: "screen-content",
                form { class: "auth-form", novalidate: true, onsubmit: submit,
                    Stack { gap: Gap::Lg,
                        Text { variant: TextVariant::Label, tone: TextTone::Brand, "{t.common.brand}" }
                        Text { tag: TextTag::H1, variant: TextVariant::Display, "{t.auth.login.title}" }
                        Text { variant: TextVariant::Body, tone: TextTone::Tertiary,
                            "{t.auth.login.subtitle}" }
                    }

                    Stack { gap: Gap::Xxl,
                        TextField {
                            label: t.auth.email.label.as_str().to_owned(),
                            size: InputSize::Xl,
                            input_type: "email".to_owned(),
                            name: "email",
                            inputmode: "email".to_owned(),
                            autocomplete: "email".to_owned(),
                            placeholder: t.auth.email.placeholder.as_str().to_owned(),
                            value: email(),
                            error: errors.read().field("email"),
                            oninput: move |value| email.set(value),
                        }
                        TextField {
                            label: t.auth.password.label.as_str().to_owned(),
                            size: InputSize::Xl,
                            input_type: "password".to_owned(),
                            name: "password",
                            autocomplete: "current-password".to_owned(),
                            placeholder: t.auth.login.password_placeholder.as_str().to_owned(),
                            value: password(),
                            error: errors.read().field("password"),
                            oninput: move |value| password.set(value),
                        }
                    }

                    Stack { gap: Gap::Xxl,
                        Button {
                            submit: true,
                            tone: ButtonTone::Brand,
                            size: ButtonSize::Xl,
                            full_width: true,
                            disabled: email().trim().is_empty() || password().is_empty(),
                            loading: submitting(),
                            "{t.auth.login.submit}"
                        }
                        if let Some(message) = errors.read().form() {
                            Text { variant: TextVariant::BodySm, tone: TextTone::Danger, center: true,
                                "{message}" }
                        }
                        HStack { gap: Gap::Zero, justify_center: true,
                            Text { variant: TextVariant::BodySm, tone: TextTone::Tertiary,
                                "{t.auth.login.no_account}" }
                            Button {
                                tone: ButtonTone::BrandGhost,
                                size: ButtonSize::Sm,
                                onclick: move |_| onnavigate.call("/signup".into()),
                                "{t.auth.login.signup_link}"
                            }
                        }
                    }
                }
            }
        }
    }
}
