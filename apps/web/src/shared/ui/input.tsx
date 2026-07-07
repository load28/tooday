import { Field as ArkField } from '@ark-ui/react/field';
import type { ComponentPropsWithRef } from 'react';
import { cx } from 'styled-system/css';
import { type InputVariantProps, input } from 'styled-system/recipes';

// Field 안에서는 Ark가 data-invalid를, 단독 사용 시엔 컨트롤이 aria-invalid를 설정한다 —
// 둘 다 같은 셀렉터로 스타일링된다.
export type InputSize = NonNullable<InputVariantProps['size']>;

type InputOwnProps = {
  size?: InputSize;
  className?: string;
};

type InputProps = InputOwnProps & Omit<ComponentPropsWithRef<'input'>, keyof InputOwnProps>;

/** Field 컨텍스트가 있으면 id·aria 배선을 물려받고, 없으면 일반 input으로 동작한다. */
export function Input({ size, className, ...rest }: InputProps) {
  return <ArkField.Input {...rest} className={cx(input({ size }), className)} />;
}
