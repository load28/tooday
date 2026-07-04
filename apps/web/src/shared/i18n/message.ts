export type ParamKeys<S extends string> = S extends `${string}{${infer P}}${infer Rest}` ? P | ParamKeys<Rest> : never;

type Exact<A extends string, B extends string> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * 파라미터 문구 선언. 의도한 플레이스홀더를 타입 인자로 선언하고,
 * 템플릿이 그것과 정확히 일치해야 컴파일된다 — 오타({mim}), 괄호 누락, 플레이스홀더 누락/초과를 선언 시점에 잡는다.
 * 런타임에는 문자열을 그대로 반환하므로 JSON 직렬화에 영향이 없다.
 */
export function msg<P extends string>() {
  return <S extends string>(
    template: Exact<ParamKeys<S>, P> extends true ? S : { 플레이스홀더불일치: { 선언: P; 템플릿: ParamKeys<S> } },
  ): S => template as S;
}

/** {param} 플레이스홀더를 값으로 치환한다. 파라미터 키는 템플릿 리터럴 타입에서 추론되어 강제된다. */
export function format<S extends string>(
  template: S,
  ...params: ParamKeys<S> extends never ? [] : [Record<ParamKeys<S>, string | number>]
): string {
  const values = (params[0] ?? {}) as Record<string, string | number>;
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => (key in values ? String(values[key]) : placeholder));
}
