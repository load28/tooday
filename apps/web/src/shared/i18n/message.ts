type ParamKeys<S extends string> = S extends `${string}{${infer P}}${infer Rest}` ? P | ParamKeys<Rest> : never;

type Exact<A extends string, B extends string> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

declare const msgParams: unique symbol;

/** 스키마에서 문구 슬롯을 선언하는 마커. P는 이 문구가 요구하는 플레이스홀더 이름들. */
export interface Msg<P extends string = never> {
  readonly [msgParams]: P;
}

/** 클라이언트가 보는 문구 타입 — 스키마의 플레이스홀더 정보가 브랜드로 붙은 문자열 */
export type MsgString<P extends string = never> = string & { readonly [msgParams]?: P };

/** 스키마에서 파생한 locale 사전의 전달(JSON) 형태 — 잎은 전부 순수 문자열 */
export type TextsOf<S> = {
  [K in keyof S]: S[K] extends Msg<string> ? string : TextsOf<S[K]>;
};

/** 스키마에서 파생한 클라이언트 뷰 — 잎이 파라미터 브랜드 문자열이라 format()이 스키마 선언대로 추론된다 */
export type MessagesOf<S> = {
  [K in keyof S]: S[K] extends Msg<infer P> ? MsgString<P> : MessagesOf<S[K]>;
};

type At<T, K> = K extends keyof T ? T[K] : never;

type ValidateTexts<S, T> = {
  [K in keyof S]: S[K] extends Msg<infer P>
    ? At<T, K> extends infer V extends string
      ? Exact<ParamKeys<V>, P> extends true
        ? V
        : { 플레이스홀더불일치: { 스키마: P; 문구: ParamKeys<V> } }
      : string
    : ValidateTexts<S[K], At<T, K>>;
} & { [K in Exclude<keyof T, keyof S>]: never };

/**
 * 스키마로부터 locale 사전을 빌드한다. 문구가 스키마 선언과 어긋나면 — 파라미터 이름
 * 오타, 선언에 없는 {플레이스홀더}, 키 누락/초과 — 해당 잎에서 컴파일 에러가 난다.
 * 런타임은 identity라 결과는 순수 문자열 객체(JSON 직렬화 가능)다.
 */
export function defineMessages<S>() {
  return <const T extends TextsOf<S>>(texts: T & ValidateTexts<S, T>): T => texts;
}

/** {param} 플레이스홀더를 값으로 치환한다. 파라미터 키는 스키마 브랜드에서 추론되어 강제된다. */
export function format<P extends string>(
  template: MsgString<P>,
  ...params: [P] extends [never] ? [] : [Record<P, string | number>]
): string {
  const values = (params[0] ?? {}) as Record<string, string | number>;
  return String(template).replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    key in values ? String(values[key]) : placeholder,
  );
}
