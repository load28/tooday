//! 순수 문자열 데이터만 둔다 — 구조와 플레이스홀더 계약은 `schema.rs`가 소유하고,
//! 키 누락·초과는 컴파일 에러가, 파라미터 어긋남은 `사전이_스키마_계약을_지킨다`
//! 테스트가 잡는다.

use super::message::{Msg, MsgCount, MsgDate, MsgDoneTotal, MsgHour, MsgHourMin, MsgMin};
use super::schema::*;

pub fn messages() -> Messages {
    Messages {
        common: Common {
            brand: Msg("TooDay"),
            error: CommonError { unexpected: Msg("문제가 발생했습니다. 잠시 후 다시 시도해 주세요.") },
            duration: Duration {
                minutes: MsgMin("{min}분"),
                hours: MsgHour("{hour}시간"),
                hours_minutes: MsgHourMin("{hour}시간 {min}분"),
            },
            status: StatusLabels { todo: Msg("할 일"), doing: Msg("진행 중"), done: Msg("완료") },
            no_project: Msg("프로젝트 없음"),
            back: Msg("뒤로"),
            more: Msg("더보기"),
            loading: Msg("로딩 중"),
        },
        not_found: NotFound { code: Msg("404"), message: Msg("페이지를 찾을 수 없습니다.") },
        nav: Nav { label: Msg("주요 메뉴"), today: Msg("오늘"), projects: Msg("프로젝트") },
        today: Today {
            title: Msg("오늘"),
            hero: TodayHero {
                today: MsgDate("오늘 · {date}"),
                remaining_prefix: Msg("할 일"),
                remaining_count: MsgCount("{count}개"),
                remaining_suffix: Msg("남았어요"),
            },
            section: TodaySection {
                morning: Msg("오전"),
                afternoon: Msg("오후"),
                evening: Msg("저녁"),
            },
            empty: TodayEmpty {
                title: Msg("이 날에는 일정이 없어요"),
                description: Msg("새 태스크를 추가해 하루를 계획해 보세요"),
            },
            notifications: Msg("알림"),
            add_task: Msg("태스크 추가"),
            toggle_done: Msg("완료 토글"),
        },
        projects: Projects {
            title: Msg("프로젝트"),
            subtitle: Msg("한 곳에서 모아보기"),
            empty: Msg("아직 프로젝트가 없어요"),
            progress: MsgDoneTotal("{done}/{total} 완료"),
            add_project: Msg("프로젝트 추가"),
        },
        project_new: ProjectNew {
            title: Msg("새 프로젝트"),
            name_label: Msg("이름"),
            name_placeholder: Msg("프로젝트 이름"),
            color_label: Msg("색상"),
            color: ColorLabels {
                blue: Msg("파랑"),
                mint: Msg("민트"),
                violet: Msg("보라"),
                amber: Msg("주황"),
                pink: Msg("핑크"),
                gray: Msg("회색"),
            },
            create: Msg("만들기"),
            name_required: Msg("이름을 입력해 주세요."),
        },
        project_detail: ProjectDetail {
            badge: Msg("프로젝트"),
            empty: Msg("이 상태의 태스크가 없어요"),
            add_task: Msg("태스크 추가"),
        },
        task_new: TaskNew {
            title: Msg("새 태스크"),
            title_placeholder: Msg("무엇을 할까요?"),
            project: Msg("프로젝트"),
            time: Msg("시간"),
            create: Msg("만들기"),
            select_project: Msg("프로젝트 선택"),
            create_project: Msg("새 프로젝트 만들기"),
            title_required: Msg("제목을 입력해 주세요."),
        },
        task_detail: TaskDetail {
            title: Msg("태스크"),
            project: Msg("프로젝트"),
            date: Msg("날짜"),
            time: Msg("시간"),
            delete: Msg("이 태스크 삭제"),
            not_found: Msg("태스크를 찾을 수 없어요"),
            change_status: Msg("상태 변경"),
            change_project: Msg("프로젝트 변경"),
            change_schedule: Msg("일정 변경"),
        },
        schedule: Schedule {
            start_label: Msg("시작 시각"),
            duration_label: Msg("기간"),
            apply: Msg("변경 적용"),
        },
        auth: Auth {
            name: FieldLabels { label: Msg("이름"), placeholder: Msg("이름") },
            email: FieldLabels { label: Msg("이메일"), placeholder: Msg("you@example.com") },
            password: PasswordLabels { label: Msg("비밀번호") },
            login: Login {
                title: Msg("로그인"),
                subtitle: Msg("이메일과 비밀번호를 입력해 주세요."),
                password_placeholder: Msg("비밀번호"),
                submit: Msg("로그인"),
                no_account: Msg("아직 계정이 없나요?"),
                signup_link: Msg("가입하기"),
                email_required: Msg("이메일을 입력해 주세요."),
                password_required: Msg("비밀번호를 입력해 주세요."),
                invalid_credentials: Msg("이메일 또는 비밀번호가 올바르지 않습니다."),
            },
            signup: Signup {
                title: Msg("회원가입"),
                subtitle: Msg("이름, 이메일, 비밀번호를 입력해 주세요."),
                password_placeholder: Msg("8자 이상"),
                submit: Msg("가입하기"),
                has_account: Msg("이미 계정이 있나요?"),
                login_link: Msg("로그인"),
                name_required: Msg("이름을 입력해 주세요."),
                email_invalid: Msg("올바른 이메일을 입력해 주세요."),
                email_taken: Msg("이미 가입된 이메일입니다."),
                password_too_short: MsgMin("비밀번호는 {min}자 이상 입력해 주세요."),
            },
        },
        settings: Settings {
            open: Msg("설정"),
            title: Msg("설정"),
            account: Account { label: Msg("계정") },
            logout: Logout {
                action: Msg("로그아웃"),
                confirm_title: Msg("로그아웃할까요?"),
                confirm_description: Msg("다시 로그인하려면 이메일과 비밀번호가 필요해요."),
                confirm: Msg("로그아웃"),
                cancel: Msg("취소"),
                error: Msg("로그아웃에 실패했어요. 잠시 후 다시 시도해 주세요."),
            },
        },
    }
}

#[cfg(test)]
mod tests {
    use super::super::message::placeholders;
    use super::*;

    /// TS의 `ValidateTexts` 컴파일 검증 대응 — 파라미터를 요구하는 문구가
    /// 선언한 이름을 정확히 그만큼만 담고 있는지 본다.
    #[test]
    fn 사전이_스키마_계약을_지킨다() {
        let t = messages();
        let cases: &[(&str, Vec<&str>, &[&str])] = &[
            ("common.duration.minutes", placeholders(t.common.duration.minutes.as_str()), MsgMin::PARAMS),
            ("common.duration.hours", placeholders(t.common.duration.hours.as_str()), MsgHour::PARAMS),
            (
                "common.duration.hoursMinutes",
                placeholders(t.common.duration.hours_minutes.as_str()),
                MsgHourMin::PARAMS,
            ),
            ("today.hero.today", placeholders(t.today.hero.today.as_str()), MsgDate::PARAMS),
            (
                "today.hero.remainingCount",
                placeholders(t.today.hero.remaining_count.as_str()),
                MsgCount::PARAMS,
            ),
            ("projects.progress", placeholders(t.projects.progress.as_str()), MsgDoneTotal::PARAMS),
            (
                "auth.signup.passwordTooShort",
                placeholders(t.auth.signup.password_too_short.as_str()),
                MsgMin::PARAMS,
            ),
        ];
        for (key, found, declared) in cases {
            assert_eq!(found.as_slice(), *declared, "{key}의 플레이스홀더가 선언과 다르다");
        }
    }

    /// 파라미터 없는 문구에 `{…}`가 섞여 있으면 치환되지 않고 그대로 노출된다
    #[test]
    fn 파라미터_없는_문구에는_플레이스홀더가_없다() {
        let t = messages();
        for (key, text) in [
            ("common.brand", t.common.brand.as_str()),
            ("common.error.unexpected", t.common.error.unexpected.as_str()),
            ("today.hero.remainingPrefix", t.today.hero.remaining_prefix.as_str()),
            ("today.hero.remainingSuffix", t.today.hero.remaining_suffix.as_str()),
            ("projects.empty", t.projects.empty.as_str()),
            ("taskDetail.notFound", t.task_detail.not_found.as_str()),
            ("settings.logout.error", t.settings.logout.error.as_str()),
        ] {
            assert!(placeholders(text).is_empty(), "{key}에 플레이스홀더가 있다");
        }
    }
}
