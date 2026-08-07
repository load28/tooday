//! 도메인 무관 디자인 시스템 프리미티브.

/// Dot의 색 계열 — 프로젝트 색과 상태 색을 함께 표현한다
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DotTone {
    Neutral,
    Primary,
    Success,
    Muted,
    Blue,
    Mint,
    Violet,
    Amber,
    Pink,
    Gray,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChipTone {
    Neutral,
    Brand,
    Success,
}
