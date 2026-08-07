//! 문구 슬롯 타입 — TS `shared/i18n/message.ts` 대응.
//!
//! TS는 `Msg<'min'>` 같은 팬텀 파라미터로 "이 문구가 요구하는 플레이스홀더"를 타입에
//! 실었고, `format()`이 그 이름을 강제했다. 러스트에서는 파라미터 집합마다 전용 타입을
//! 두고 `format`의 인자로 못박는다 — 이름 오타나 인자 누락이 컴파일 에러가 된다.

use std::fmt::Display;

/// `{name}` 플레이스홀더를 값으로 치환한다. 지정되지 않은 자리는 그대로 남긴다.
fn substitute(template: &str, params: &[(&str, String)]) -> String {
    let mut out = String::with_capacity(template.len());
    let mut rest = template;
    while let Some(start) = rest.find('{') {
        let Some(end) = rest[start..].find('}').map(|offset| start + offset) else {
            break;
        };
        let key = &rest[start + 1..end];
        out.push_str(&rest[..start]);
        match params.iter().find(|(name, _)| *name == key) {
            Some((_, value)) => out.push_str(value),
            None => out.push_str(&rest[start..=end]),
        }
        rest = &rest[end + 1..];
    }
    out.push_str(rest);
    out
}

/// 플레이스홀더가 없는 문구
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Msg(pub &'static str);

impl Msg {
    pub fn as_str(self) -> &'static str {
        self.0
    }
}

impl Display for Msg {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.0)
    }
}

/// 파라미터를 요구하는 문구 타입을 만든다. 각 타입은 자기 파라미터 이름만 받는
/// `format`을 갖는다 — 다른 이름을 넣거나 빠뜨리면 컴파일되지 않는다.
macro_rules! parameterized_message {
    ($name:ident, $($param:ident),+) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub struct $name(pub &'static str);

        impl $name {
            pub fn as_str(self) -> &'static str {
                self.0
            }

            pub fn format(self, $($param: impl Display),+) -> String {
                substitute(self.0, &[$((stringify!($param), $param.to_string())),+])
            }

            /// 이 문구가 요구하는 플레이스홀더 이름 — 사전 검증 테스트가 쓴다
            pub const PARAMS: &'static [&'static str] = &[$(stringify!($param)),+];
        }
    };
}

parameterized_message!(MsgMin, min);
parameterized_message!(MsgHour, hour);
parameterized_message!(MsgHourMin, hour, min);
parameterized_message!(MsgDate, date);
parameterized_message!(MsgCount, count);
parameterized_message!(MsgDoneTotal, done, total);

/// 문구에 실제로 박힌 `{…}` 이름들 — 선언과 어긋나는지 검증할 때 쓴다
pub fn placeholders(template: &str) -> Vec<&str> {
    let mut found = Vec::new();
    let mut rest = template;
    while let Some(start) = rest.find('{') {
        let Some(end) = rest[start..].find('}').map(|offset| start + offset) else {
            break;
        };
        found.push(&rest[start + 1..end]);
        rest = &rest[end + 1..];
    }
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 플레이스홀더를_값으로_치환한다() {
        assert_eq!(MsgMin("{min}분").format(30), "30분");
        assert_eq!(MsgHourMin("{hour}시간 {min}분").format(1, 30), "1시간 30분");
        assert_eq!(MsgDoneTotal("{done}/{total} 완료").format(3, 8), "3/8 완료");
    }

    #[test]
    fn 지정되지_않은_자리는_그대로_남는다() {
        assert_eq!(substitute("{a}와 {b}", &[("a", "가".into())]), "가와 {b}");
    }

    #[test]
    fn 플레이스홀더_이름을_추출한다() {
        assert_eq!(placeholders("{hour}시간 {min}분"), vec!["hour", "min"]);
        assert_eq!(placeholders("플레이스홀더 없음"), Vec::<&str>::new());
    }
}
