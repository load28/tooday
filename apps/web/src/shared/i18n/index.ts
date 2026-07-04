import { createContext, useContext } from 'react';
import type { ko } from './ko';

/**
 * 기준 사전(ko)의 리터럴 타입. 클라이언트는 항상 이 타입으로 사전을 다룬다 —
 * 런타임 데이터는 선택된 locale의 JSON이지만, 구조와 {param} 템플릿이 계약으로 동일하다.
 */
export type Messages = typeof ko;

/** 다른 locale 사전이 지켜야 하는 구조 계약 (문구 내용은 자유, 잎은 전부 문자열) */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export type Dictionary = Shape<Messages>;

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

type ParamKeys<S extends string> = S extends `${string}{${infer P}}${infer Rest}` ? P | ParamKeys<Rest> : never;

/** {param} 플레이스홀더를 값으로 치환한다. 파라미터 키는 템플릿 리터럴 타입에서 추론되어 강제된다. */
export function format<S extends string>(
  template: S,
  ...params: ParamKeys<S> extends never ? [] : [Record<ParamKeys<S>, string | number>]
): string {
  const values = (params[0] ?? {}) as Record<string, string | number>;
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => (key in values ? String(values[key]) : placeholder));
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
  // 런타임 값은 선택된 locale의 사전이지만, 타입은 기준(ko) 리터럴로 본다 —
  // 체이닝 자동완성과 format()의 {param} 추론이 여기서 나온다.
  return useI18n().dictionary as Messages;
}
