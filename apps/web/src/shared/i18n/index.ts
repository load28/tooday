import { createContext, useContext } from 'react';
import type { MessagesOf, TextsOf } from './message';
import type { MessageSchema } from './schema';

export { defineMessages, format } from './message';
export type { MessageSchema } from './schema';

/** 클라이언트 뷰 타입 — 스키마에서 파생. 체이닝 자동완성과 format() 파라미터 추론의 원천. */
export type Messages = MessagesOf<MessageSchema>;

/** 전달(JSON) 형태 — 잎이 전부 순수 문자열 */
export type Dictionary = TextsOf<MessageSchema>;

export const SUPPORTED_LOCALES = ['ko'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

/** 선택된 locale의 사전만 동적 import로 로드한다 — 다른 locale은 번들/메모리에 올라오지 않는다 */
export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  switch (locale) {
    case 'ko':
      return (await import('./ko')).ko;
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
  dictionary: Dictionary;
}

// locale과 사전은 요청 스코프(루트 라우트 loader)에서 결정되어 컨텍스트로 내려온다.
// 전역 상태가 없어 SSR에서 동시 요청 간 locale이 섞이지 않는다.
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
  // 런타임 값은 선택된 locale의 JSON 사전이지만, 타입은 스키마에서 파생된 브랜드 뷰로 본다
  return useI18n().dictionary as Messages;
}
