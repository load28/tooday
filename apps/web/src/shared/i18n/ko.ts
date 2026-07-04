import { msg } from './message';

// 기준(canonical) 사전. 이 상수의 리터럴 타입이 모든 locale의 구조·템플릿 파라미터 계약이 된다.
// 값은 순수 문자열만 — loader가 JSON으로 직렬화해 클라이언트로 내려주기 때문에 함수를 둘 수 없다.
// 파라미터 문구는 msg<'이름'>()('...{이름}...')으로 선언해 플레이스홀더 오타를 컴파일 타임에 잡는다.
export const ko = {
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
      passwordTooShort: msg<'min'>()('비밀번호는 {min}자 이상 입력해 주세요.'),
    },
  },
} as const;
