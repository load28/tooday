// Panda recipe의 splitVariantProps 대체 — recipe.variants()로 variant 키를 갈라 [variantProps, rest]를 돌려준다.
// biome-ignore lint/suspicious/noExplicitAny: recipe 런타임 함수 시그니처는 recipe마다 달라 옵션 타입을 any로 바운드한다
type AnyRecipeFn = ((options?: any) => string) & { variants: () => string[] };

export function splitVariantProps<Fn extends AnyRecipeFn, Props extends Record<string, unknown>>(
  recipeFn: Fn,
  props: Props,
): [NonNullable<Parameters<Fn>[0]>, Omit<Props, keyof NonNullable<Parameters<Fn>[0]>>] {
  const variantKeys = recipeFn.variants();
  const variantProps: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (variantKeys.includes(key)) variantProps[key] = props[key];
    else rest[key] = props[key];
  }
  return [variantProps as NonNullable<Parameters<Fn>[0]>, rest as Omit<Props, keyof NonNullable<Parameters<Fn>[0]>>];
}
