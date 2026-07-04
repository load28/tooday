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
