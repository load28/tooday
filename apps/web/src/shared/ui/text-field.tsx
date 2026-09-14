import type { ComponentPropsWithRef } from 'react';
import { Field } from '@/shared/ui/field';
import { Input, type InputSize } from '@/shared/ui/input';

type TextFieldBase = {
  label?: string;
  helper?: string;
  error?: string;
  invalid?: boolean;
  size?: InputSize;
};

type TextFieldProps = TextFieldBase & Omit<ComponentPropsWithRef<'input'>, keyof TextFieldBase | 'className' | 'style'>;

/** Field + Input의 단축 조합. 슬롯 구성이 필요하면 Field와 Input을 직접 조합한다. */
export function TextField({ label, helper, error, invalid, size, ...inputProps }: TextFieldProps) {
  return (
    <Field label={label} helper={helper} error={error} invalid={invalid}>
      <Input size={size} {...inputProps} />
    </Field>
  );
}
