use tooday_shared::TaskStatus;

use crate::shared::ui::{ChipTone, DotTone};

/// 상태 표시 순서 — 보드 세그먼트(projects)·상태 선택 시트(tasks) 등 여러 feature가 공용한다
pub const STATUS_ORDER: [TaskStatus; 3] = [TaskStatus::Todo, TaskStatus::Doing, TaskStatus::Done];

/// 상태 → Dot tone (점 색)
pub fn status_dot_tone(status: TaskStatus) -> DotTone {
    match status {
        TaskStatus::Todo => DotTone::Neutral,
        TaskStatus::Doing => DotTone::Primary,
        TaskStatus::Done => DotTone::Success,
    }
}

/// 상태 → Chip tone (알약 색)
pub fn status_chip_tone(status: TaskStatus) -> ChipTone {
    match status {
        TaskStatus::Todo => ChipTone::Neutral,
        TaskStatus::Doing => ChipTone::Brand,
        TaskStatus::Done => ChipTone::Success,
    }
}
