pub mod ko;
pub mod message;
pub mod schema;

pub use message::{Msg, MsgCount, MsgDate, MsgDoneTotal, MsgHour, MsgHourMin, MsgMin};
pub use schema::Messages;

pub const SUPPORTED_LOCALES: [Locale; 1] = [Locale::Ko];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Locale {
    #[default]
    Ko,
}

impl Locale {
    pub fn as_str(self) -> &'static str {
        match self {
            Locale::Ko => "ko",
        }
    }

    fn from_language(language: &str) -> Option<Self> {
        SUPPORTED_LOCALES.into_iter().find(|locale| locale.as_str() == language)
    }
}

pub const DEFAULT_LOCALE: Locale = Locale::Ko;

/// 선택된 locale의 사전만 만든다 — 다른 locale은 메모리에 올라오지 않는다
pub fn load_dictionary(locale: Locale) -> Messages {
    match locale {
        Locale::Ko => ko::messages(),
    }
}

/// Accept-Language(서버) 또는 navigator.language(클라이언트) 값에서 지원 locale을 고른다
pub fn resolve_locale(preference: Option<&str>) -> Locale {
    let Some(preference) = preference.filter(|value| !value.is_empty()) else {
        return DEFAULT_LOCALE;
    };
    preference
        .split(',')
        .find_map(|part| {
            let language = part.split(';').next()?.trim().to_lowercase();
            Locale::from_language(language.split('-').next()?)
        })
        .unwrap_or(DEFAULT_LOCALE)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 지원하는_locale을_고른다() {
        assert_eq!(resolve_locale(Some("ko")), Locale::Ko);
        assert_eq!(resolve_locale(Some("ko-KR")), Locale::Ko);
        assert_eq!(resolve_locale(Some("en-US,ko;q=0.9")), Locale::Ko);
    }

    #[test]
    fn 지원하지_않거나_비면_기본_locale이다() {
        assert_eq!(resolve_locale(Some("en-US")), DEFAULT_LOCALE);
        assert_eq!(resolve_locale(Some("")), DEFAULT_LOCALE);
        assert_eq!(resolve_locale(None), DEFAULT_LOCALE);
    }
}
