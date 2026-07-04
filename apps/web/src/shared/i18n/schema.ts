import type { Msg } from './message';

// 문구의 단일 계약: 구조(키)와 각 문구가 요구하는 플레이스홀더를 여기서 한 번만 선언한다.
// 모든 locale 사전은 defineMessages<MessageSchema>()로 이 스키마에서 빌드된다.
export interface MessageSchema {
  common: {
    brand: Msg;
    error: {
      unexpected: Msg;
    };
    duration: {
      minutes: Msg<'min'>;
      hours: Msg<'hour'>;
      hoursMinutes: Msg<'hour' | 'min'>;
    };
  };
  nav: {
    label: Msg;
    today: Msg;
    projects: Msg;
  };
  today: {
    title: Msg;
    hero: {
      // '오늘 · 5월 3일 토요일' — 오늘이 아닌 날은 date만 그대로 보여준다
      today: Msg<'date'>;
      // 카운트만 색을 달리 입히므로 문장을 세 조각으로 나눠 선언한다
      remainingPrefix: Msg;
      remainingCount: Msg<'count'>;
      remainingSuffix: Msg;
    };
    section: {
      morning: Msg;
      afternoon: Msg;
      evening: Msg;
    };
    empty: {
      title: Msg;
      description: Msg;
    };
    notifications: Msg;
    addTask: Msg;
    toggleDone: Msg;
  };
  auth: {
    name: {
      label: Msg;
      placeholder: Msg;
    };
    email: {
      label: Msg;
      placeholder: Msg;
    };
    password: {
      label: Msg;
    };
    login: {
      title: Msg;
      subtitle: Msg;
      passwordPlaceholder: Msg;
      submit: Msg;
      noAccount: Msg;
      signupLink: Msg;
      emailRequired: Msg;
      passwordRequired: Msg;
      invalidCredentials: Msg;
    };
    signup: {
      title: Msg;
      subtitle: Msg;
      passwordPlaceholder: Msg;
      submit: Msg;
      hasAccount: Msg;
      loginLink: Msg;
      nameRequired: Msg;
      emailInvalid: Msg;
      emailTaken: Msg;
      passwordTooShort: Msg<'min'>;
    };
  };
}
