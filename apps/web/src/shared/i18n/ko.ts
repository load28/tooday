import { defineMessages } from './message';
import type { MessageSchema } from './schema';

// 순수 문자열 데이터만 둔다 — 구조와 플레이스홀더 계약은 schema.ts가 소유하고,
// 빌더가 어긋남(파라미터 오타, 선언에 없는 {…}, 키 누락/초과)을 컴파일 에러로 잡는다.
export const ko = defineMessages<MessageSchema>()({
  common: {
    brand: 'TooDay',
    error: {
      unexpected: '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    },
    duration: {
      minutes: '{min}분',
      hours: '{hour}시간',
      hoursMinutes: '{hour}시간 {min}분',
    },
    status: {
      todo: '할 일',
      doing: '진행 중',
      done: '완료',
    },
    noProject: '프로젝트 없음',
    back: '뒤로',
    more: '더보기',
  },
  nav: {
    label: '주요 메뉴',
    today: '오늘',
    projects: '프로젝트',
  },
  today: {
    title: '오늘',
    hero: {
      today: '오늘 · {date}',
      remainingPrefix: '할 일',
      remainingCount: '{count}개',
      remainingSuffix: '남았어요',
    },
    section: {
      morning: '오전',
      afternoon: '오후',
      evening: '저녁',
    },
    empty: {
      title: '이 날에는 일정이 없어요',
      description: '새 태스크를 추가해 하루를 계획해 보세요',
    },
    notifications: '알림',
    addTask: '태스크 추가',
    toggleDone: '완료 토글',
  },
  projects: {
    title: '프로젝트',
    subtitle: '한 곳에서 모아보기',
    empty: '아직 프로젝트가 없어요',
    progress: '{done}/{total} 완료',
    addProject: '프로젝트 추가',
  },
  projectNew: {
    title: '새 프로젝트',
    nameLabel: '이름',
    namePlaceholder: '프로젝트 이름',
    colorLabel: '색상',
    color: {
      blue: '파랑',
      mint: '민트',
      violet: '보라',
      amber: '주황',
      pink: '핑크',
      gray: '회색',
    },
    create: '만들기',
    nameRequired: '이름을 입력해 주세요.',
  },
  projectDetail: {
    badge: '프로젝트',
    empty: '이 상태의 태스크가 없어요',
    addTask: '태스크 추가',
  },
  taskNew: {
    title: '새 태스크',
    titlePlaceholder: '무엇을 할까요?',
    project: '프로젝트',
    time: '시간',
    create: '만들기',
    selectProject: '프로젝트 선택',
    createProject: '새 프로젝트 만들기',
    titleRequired: '제목을 입력해 주세요.',
  },
  taskDetail: {
    title: '태스크',
    project: '프로젝트',
    date: '날짜',
    time: '시간',
    delete: '이 태스크 삭제',
    notFound: '태스크를 찾을 수 없어요',
    changeStatus: '상태 변경',
    changeProject: '프로젝트 변경',
    changeSchedule: '일정 변경',
  },
  schedule: {
    startLabel: '시작 시각',
    durationLabel: '기간',
    apply: '변경 적용',
  },
  auth: {
    name: {
      label: '이름',
      placeholder: '이름',
    },
    email: {
      label: '이메일',
      placeholder: 'you@example.com',
    },
    password: {
      label: '비밀번호',
    },
    login: {
      title: '로그인',
      subtitle: '이메일과 비밀번호를 입력해 주세요.',
      passwordPlaceholder: '비밀번호',
      submit: '로그인',
      noAccount: '아직 계정이 없나요?',
      signupLink: '가입하기',
      emailRequired: '이메일을 입력해 주세요.',
      passwordRequired: '비밀번호를 입력해 주세요.',
      invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    },
    signup: {
      title: '회원가입',
      subtitle: '이름, 이메일, 비밀번호를 입력해 주세요.',
      passwordPlaceholder: '8자 이상',
      submit: '가입하기',
      hasAccount: '이미 계정이 있나요?',
      loginLink: '로그인',
      nameRequired: '이름을 입력해 주세요.',
      emailInvalid: '올바른 이메일을 입력해 주세요.',
      emailTaken: '이미 가입된 이메일입니다.',
      passwordTooShort: '비밀번호는 {min}자 이상 입력해 주세요.',
    },
  },
});
