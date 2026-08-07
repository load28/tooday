//! 프리미티브가 공유하는 variant 열거형.
//!
//! TS는 vanilla-extract recipe의 variant 키로 이 값들을 표현했다. 여기서는 열거형으로
//! 두고 `data-*` 속성으로 방출한다 — CSS는 같은 속성 선택자로 규칙을 건다.
//! recipe가 관리하는 속성은 className으로 덮지 않고 variant로 지정한다
//! (docs/conventions/ui-styling.md).

use tooday_shared::{ProjectColor, TaskStatus};

/// variant 열거형을 만든다. **첫 항목이 기본값**이다 — TS recipe의
/// `defaultVariants`에 대응한다.
macro_rules! variant {
    ($name:ident { $default:ident => $default_value:literal $(, $case:ident => $value:literal)* $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
        pub enum $name {
            #[default]
            $default,
            $($case),*
        }

        impl $name {
            pub fn as_str(self) -> &'static str {
                match self {
                    Self::$default => $default_value,
                    $(Self::$case => $value),*
                }
            }
        }
    };
}

variant!(ButtonTone {
    Plain => "plain",
    Brand => "brand",
    BrandGhost => "brandGhost",
    Subtle => "subtle",
    Ghost => "ghost",
    Danger => "danger",
    DangerSoft => "dangerSoft",
});

variant!(ButtonSize {
    Md => "md",
    Sm => "sm",
    Lg => "lg",
    Xl => "xl",
    Icon => "icon",
});

variant!(ButtonShape {
    Default => "default",
    Square => "square",
    Pill => "pill",
});

variant!(CardRadius {
    Md => "md",
    Xxl => "2xl",
});

variant!(CardPadding {
    Md => "md",
    None => "none",
    Sm => "sm",
    Lg => "lg",
});

variant!(TextVariant {
    Body => "body",
    Display => "display",
    Title => "title",
    Subtitle => "subtitle",
    BodyLg => "bodyLg",
    BodyLgStrong => "bodyLgStrong",
    BodyStrong => "bodyStrong",
    BodySm => "bodySm",
    Label => "label",
    Caption => "caption",
    CaptionStrong => "captionStrong",
    Micro => "micro",
    Overline => "overline",
    Numeric => "numeric",
    NumericLg => "numericLg",
});

variant!(TextTone {
    Default => "default",
    Secondary => "secondary",
    Tertiary => "tertiary",
    Placeholder => "placeholder",
    Brand => "brand",
    Danger => "danger",
    Inverse => "inverse",
});

variant!(Gap {
    Md => "md",
    Zero => "0",
    Xxs => "2xs",
    Xs => "xs",
    Sm => "sm",
    Lg => "lg",
    Xl => "xl",
    Xxl => "2xl",
    Xxxl => "3xl",
    Xxxxl => "4xl",
});

variant!(DotSize {
    Md => "md",
    Sm => "sm",
});

variant!(ChipSize {
    Md => "md",
    Lg => "lg",
});

variant!(InputVariant {
    Default => "default",
    Inline => "inline",
});

variant!(InputSize {
    Md => "md",
    Xl => "xl",
});

// Dot의 색 계열 — 프로젝트 색과 상태 색을 함께 표현한다
variant!(DotTone {
    Neutral => "neutral",
    Primary => "primary",
    Success => "success",
    Muted => "muted",
    Blue => "blue",
    Mint => "mint",
    Violet => "violet",
    Amber => "amber",
    Pink => "pink",
    Gray => "gray",
});

variant!(ChipTone {
    Neutral => "neutral",
    Brand => "brand",
    Success => "success",
});

impl From<ProjectColor> for DotTone {
    fn from(color: ProjectColor) -> Self {
        match color {
            ProjectColor::Blue => DotTone::Blue,
            ProjectColor::Mint => DotTone::Mint,
            ProjectColor::Violet => DotTone::Violet,
            ProjectColor::Amber => DotTone::Amber,
            ProjectColor::Pink => DotTone::Pink,
            ProjectColor::Gray => DotTone::Gray,
        }
    }
}

/// 상태 라벨 — i18n 사전에서 고른다
pub fn status_label(t: &crate::shared::i18n::Messages, status: TaskStatus) -> &'static str {
    match status {
        TaskStatus::Todo => t.common.status.todo.as_str(),
        TaskStatus::Doing => t.common.status.doing.as_str(),
        TaskStatus::Done => t.common.status.done.as_str(),
    }
}

/// `data-*` 플래그 — true일 때만 속성을 붙인다(CSS 선택자가 존재 여부로 판정)
pub fn flag(value: bool) -> Option<&'static str> {
    value.then_some("true")
}
