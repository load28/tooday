//! 문구의 단일 계약: 구조(키)와 각 문구가 요구하는 플레이스홀더를 여기서 한 번만 선언한다.
//! 모든 locale 사전은 이 구조체를 채워서 만들며, 키 누락·초과나 파라미터 어긋남은
//! 컴파일 에러(구조체 필드) 또는 사전 검증 테스트(플레이스홀더)가 잡는다.

use super::message::{Msg, MsgCount, MsgDate, MsgDoneTotal, MsgHour, MsgHourMin, MsgMin};

#[derive(Debug, Clone, Copy)]
pub struct Messages {
    pub common: Common,
    pub not_found: NotFound,
    pub nav: Nav,
    pub today: Today,
    pub projects: Projects,
    pub project_new: ProjectNew,
    pub project_detail: ProjectDetail,
    pub task_new: TaskNew,
    pub task_detail: TaskDetail,
    pub schedule: Schedule,
    pub auth: Auth,
    pub settings: Settings,
}

#[derive(Debug, Clone, Copy)]
pub struct Common {
    pub brand: Msg,
    pub error: CommonError,
    pub duration: Duration,
    pub status: StatusLabels,
    pub no_project: Msg,
    pub back: Msg,
    pub more: Msg,
    pub loading: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct CommonError {
    pub unexpected: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct Duration {
    pub minutes: MsgMin,
    pub hours: MsgHour,
    pub hours_minutes: MsgHourMin,
}

#[derive(Debug, Clone, Copy)]
pub struct StatusLabels {
    pub todo: Msg,
    pub doing: Msg,
    pub done: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct NotFound {
    pub code: Msg,
    pub message: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct Nav {
    pub label: Msg,
    pub today: Msg,
    pub projects: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct Today {
    pub title: Msg,
    pub hero: TodayHero,
    pub section: TodaySection,
    pub empty: TodayEmpty,
    pub notifications: Msg,
    pub add_task: Msg,
    pub toggle_done: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct TodayHero {
    /// '오늘 · 5월 3일 토요일' — 오늘이 아닌 날은 date만 그대로 보여준다
    pub today: MsgDate,
    /// 카운트만 색을 달리 입히므로 문장을 세 조각으로 나눠 선언한다
    pub remaining_prefix: Msg,
    pub remaining_count: MsgCount,
    pub remaining_suffix: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct TodaySection {
    pub morning: Msg,
    pub afternoon: Msg,
    pub evening: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct TodayEmpty {
    pub title: Msg,
    pub description: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct Projects {
    pub title: Msg,
    pub subtitle: Msg,
    pub empty: Msg,
    /// '3/8 완료' — 완료·전체 태스크 수
    pub progress: MsgDoneTotal,
    pub add_project: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct ProjectNew {
    pub title: Msg,
    pub name_label: Msg,
    pub name_placeholder: Msg,
    pub color_label: Msg,
    /// 색상 칩의 접근성 라벨 — 키는 프로젝트 색 계약(`PROJECT_COLORS`)과 1:1
    pub color: ColorLabels,
    pub create: Msg,
    pub name_required: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct ColorLabels {
    pub blue: Msg,
    pub mint: Msg,
    pub violet: Msg,
    pub amber: Msg,
    pub pink: Msg,
    pub gray: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct ProjectDetail {
    pub badge: Msg,
    pub empty: Msg,
    pub add_task: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct TaskNew {
    pub title: Msg,
    pub title_placeholder: Msg,
    pub project: Msg,
    pub time: Msg,
    pub create: Msg,
    pub select_project: Msg,
    pub create_project: Msg,
    pub title_required: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct TaskDetail {
    pub title: Msg,
    pub project: Msg,
    pub date: Msg,
    pub time: Msg,
    pub delete: Msg,
    pub not_found: Msg,
    pub change_status: Msg,
    pub change_project: Msg,
    pub change_schedule: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct Schedule {
    pub start_label: Msg,
    pub duration_label: Msg,
    pub apply: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct Auth {
    pub name: FieldLabels,
    pub email: FieldLabels,
    pub password: PasswordLabels,
    pub login: Login,
    pub signup: Signup,
}

#[derive(Debug, Clone, Copy)]
pub struct FieldLabels {
    pub label: Msg,
    pub placeholder: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct PasswordLabels {
    pub label: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct Login {
    pub title: Msg,
    pub subtitle: Msg,
    pub password_placeholder: Msg,
    pub submit: Msg,
    pub no_account: Msg,
    pub signup_link: Msg,
    pub email_required: Msg,
    pub password_required: Msg,
    pub invalid_credentials: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct Signup {
    pub title: Msg,
    pub subtitle: Msg,
    pub password_placeholder: Msg,
    pub submit: Msg,
    pub has_account: Msg,
    pub login_link: Msg,
    pub name_required: Msg,
    pub email_invalid: Msg,
    pub email_taken: Msg,
    pub password_too_short: MsgMin,
}

#[derive(Debug, Clone, Copy)]
pub struct Settings {
    pub open: Msg,
    pub title: Msg,
    pub account: Account,
    pub logout: Logout,
}

#[derive(Debug, Clone, Copy)]
pub struct Account {
    pub label: Msg,
}

#[derive(Debug, Clone, Copy)]
pub struct Logout {
    pub action: Msg,
    pub confirm_title: Msg,
    pub confirm_description: Msg,
    pub confirm: Msg,
    pub cancel: Msg,
    pub error: Msg,
}
