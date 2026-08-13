import { createContext, useContext } from 'react';
import type { MessagesOf, TextsOf } from './message';
import { ko } from './ko';
import type { MessageSchema } from './schema';

export { defineMessages } from './message';
export type { MessageSchema } from './schema';

/** 클라이언트 뷰 타입 — 스키마에서 파생. 체이닝 자동완성과 함수 인자 추론의 원천. */
export type Messages = MessagesOf<MessageSchema>;

/** locale 작성용 사전 형태 — 인자가 없는 잎은 문자열, 인자가 있는 잎은 함수 */
export type Dictionary = TextsOf<MessageSchema>;

export const SUPPORTED_LOCALES = ['ko'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

/** 선택된 locale의 사전을 고른다. 함수형 문구가 있어 loader JSON으로 직렬화하지 않는다. */
export function getDictionary(locale: Locale): Messages {
  switch (locale) {
    case 'ko':
      return ko as unknown as Messages;
  }
}

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

interface I18nState {
  locale: Locale;
  dictionary: Messages;
}

// locale은 요청 스코프(루트 라우트 loader)에서 결정되고, 사전은 렌더 시 locale로 고른다.
// 함수형 문구를 loader 데이터로 직렬화하지 않아 SSR hydration 경계를 넘지 않는다.
const I18nContext = createContext<I18nState | null>(null);

export const I18nProvider = I18nContext.Provider;

function useI18n(): I18nState {
  const state = useContext(I18nContext);
  if (!state) throw new Error('useT/useLocale은 I18nProvider 아래에서만 쓸 수 있다');
  return state;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

export function useT(): Messages {
  return useI18n().dictionary;
}
