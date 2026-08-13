declare const msgParams: unique symbol;
declare const paramName: unique symbol;

type ParamValue<P extends string> = (string | number) & { readonly [paramName]: P };
type RenderParams<P extends string> = { [K in P]: ParamValue<K> };
type I18nUsedArgs<P extends string> = {
  readonly i18n_missing_args: { readonly [K in P]: K };
};
type UsedParam<T> = T extends ParamValue<infer P> ? P : never;

type LocaleMessageValue<P extends string> = [P] extends [never]
  ? string
  : (params: RenderParams<P>) => {
      readonly i18n_missing_args: { readonly [K in P]: K };
    };
type MessageValue<P extends string> = [P] extends [never] ? string : (params: Record<P, string | number>) => string;

/** 스키마에서 문구 슬롯을 선언하는 마커. P는 이 문구가 요구하는 인자 이름들. */
export interface Msg<P extends string = never> {
  readonly [msgParams]: P;
}

/** 스키마에서 파생한 locale 사전 형태 — 인자가 없는 잎은 문자열, 인자가 있는 잎은 함수 */
export type TextsOf<S> = {
  [K in keyof S]: S[K] extends Msg<infer P> ? LocaleMessageValue<P> : TextsOf<S[K]>;
};

/** 스키마에서 파생한 클라이언트 뷰 — 체이닝 자동완성과 함수 인자 추론의 원천 */
export type MessagesOf<S> = {
  [K in keyof S]: S[K] extends Msg<infer P> ? MessageValue<P> : MessagesOf<S[K]>;
};

type At<T, K> = K extends keyof T ? T[K] : never;

type ValidateTexts<S, T> = {
  [K in keyof S]: S[K] extends Msg<infer P>
    ? At<T, K> extends LocaleMessageValue<P>
      ? At<T, K>
      : LocaleMessageValue<P>
    : ValidateTexts<S[K], At<T, K>>;
} & { [K in Exclude<keyof T, keyof S>]: never };

/**
 * 스키마로부터 locale 사전을 빌드한다. 인자가 필요한 문구는 함수로 선언하고,
 * 함수의 인자 객체는 스키마의 Msg<P>에서 추론된다. 런타임은 identity다.
 */
export function defineMessages<S>() {
  return <const T extends TextsOf<S>>(texts: T extends ValidateTexts<S, T> ? T : ValidateTexts<S, T>): T => texts as T;
}

/** 인자가 있는 locale 문구를 만든다. 보간된 인자 이름을 타입에 남겨 누락 사용을 잡는다. */
export function msg<const Values extends readonly unknown[]>(
  strings: TemplateStringsArray,
  ...values: Values
): I18nUsedArgs<UsedParam<Values[number]>> {
  let result = strings[0] ?? '';
  for (let index = 0; index < values.length; index += 1) {
    result += String(values[index]) + (strings[index + 1] ?? '');
  }
  return result as unknown as I18nUsedArgs<UsedParam<Values[number]>>;
}
