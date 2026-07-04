import type { Msg } from './message';

// 문구의 단일 계약: 구조(키)와 각 문구가 요구하는 플레이스홀더를 여기서 한 번만 선언한다.
// 모든 locale 사전은 defineMessages<MessageSchema>()로 이 스키마에서 빌드된다.
export interface MessageSchema {
  common: {
    brand: Msg;
    error: {
      unexpected: Msg;
    };
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
