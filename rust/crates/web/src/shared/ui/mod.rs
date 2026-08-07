//! 도메인 무관 디자인 시스템 프리미티브.
//!
//! 의존 방향: routes → features → entities → app/shared (역방향 금지).

pub mod icons;
pub mod inputs;
pub mod layout;
pub mod primitives;
pub mod tokens;

pub use inputs::{ColorSwatch, ColorSwatchGroup, Field, Input, TextField};
pub use layout::{AppBar, BottomSheet, Screen, TabBar, TabItem};
pub use primitives::{
    BaseButton, Button, Card, Chip, Divider, Dot, HStack, ProgressBar, Row, Section, Spinner, Stack, Surface,
    Text, TextTag,
};
pub use tokens::{
    flag, status_label, ButtonShape, ButtonSize, ButtonTone, CardPadding, CardRadius, ChipSize, ChipTone,
    DotSize, DotTone, Gap, InputSize, InputVariant, TextTone, TextVariant,
};
