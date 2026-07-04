import { createContext, useContext, useMemo } from 'react';

// 사용자향 문구 사전. 화면은 useT()로 얻은 t와 키로만 문구를 참조한다.
// locale 추가 시: SUPPORTED_LOCALES에 코드를 넣고 dictionaries에 같은 키 구조의 사전을 추가한다.
const ko = {
  'common.brand': 'TooDay',
  'common.error.unexpected': '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',

  'auth.name.label': '이름',
  'auth.name.placeholder': '이름',
  'auth.email.label': '이메일',
  'auth.email.placeholder': 'you@example.com',
  'auth.password.label': '비밀번호',

  'auth.login.title': '로그인',
  'auth.login.subtitle': '이메일과 비밀번호를 입력해 주세요.',
  'auth.login.passwordPlaceholder': '비밀번호',
  'auth.login.submit': '로그인',
  'auth.login.noAccount': '아직 계정이 없나요?',
  'auth.login.signupLink': '가입하기',
  'auth.login.emailRequired': '이메일을 입력해 주세요.',
  'auth.login.passwordRequired': '비밀번호를 입력해 주세요.',
  'auth.login.invalidCredentials': '이메일 또는 비밀번호가 올바르지 않습니다.',

  'auth.signup.title': '회원가입',
  'auth.signup.subtitle': '이름, 이메일, 비밀번호를 입력해 주세요.',
  'auth.signup.passwordPlaceholder': '8자 이상',
  'auth.signup.submit': '가입하기',
  'auth.signup.hasAccount': '이미 계정이 있나요?',
  'auth.signup.loginLink': '로그인',
  'auth.signup.nameRequired': '이름을 입력해 주세요.',
  'auth.signup.emailInvalid': '올바른 이메일을 입력해 주세요.',
  'auth.signup.emailTaken': '이미 가입된 이메일입니다.',
  'auth.signup.passwordTooShort': (params: { min: number }) => `비밀번호는 ${params.min}자 이상 입력해 주세요.`,
} as const;

export type MessageKey = keyof typeof ko;

/** 모든 locale 사전이 지켜야 하는 키/파라미터 구조 (ko가 기준) */
type Dictionary = {
  [K in MessageKey]: (typeof ko)[K] extends (params: infer P) => string ? (params: P) => string : string;
};

export const SUPPORTED_LOCALES = ['ko'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

const dictionaries = { ko } satisfies Record<Locale, Dictionary>;

/** Accept-Language(서버) 또는 navigator.language(클라이언트) 값에서 지원 locale을 고른다 */
export function resolveLocale(preference: string | null | undefined): Locale {
  if (!preference) return DEFAULT_LOCALE;
  for (const part of preference.split(',')) {
    const lang = part.split(';')[0]?.trim().toLowerCase().split('-')[0];
    const match = SUPPORTED_LOCALES.find((locale) => locale === lang);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export function createT(locale: Locale) {
  const dictionary = dictionaries[locale];
  return function t<K extends MessageKey>(
    key: K,
    ...params: Dictionary[K] extends (params: infer P) => string ? [P] : []
  ): string {
    const entry = dictionary[key];
    return typeof entry === 'function' ? entry(params[0] as never) : entry;
  };
}

export type T = ReturnType<typeof createT>;

// locale은 요청 스코프(루트 라우트 loader)에서 결정되어 컨텍스트로 내려온다.
// 전역 상태가 없어 SSR에서 동시 요청 간 locale이 섞이지 않는다.
const I18nContext = createContext<Locale>(DEFAULT_LOCALE);

export const I18nProvider = I18nContext.Provider;

export function useLocale(): Locale {
  return useContext(I18nContext);
}

export function useT(): T {
  const locale = useContext(I18nContext);
  return useMemo(() => createT(locale), [locale]);
}
