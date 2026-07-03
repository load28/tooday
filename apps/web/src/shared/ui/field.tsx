import { Field as ArkField } from '@ark-ui/react/field';
import type { ReactNode } from 'react';
import { css, cx } from 'styled-system/css';
import { Text } from '@/shared/ui/text';

const rootCls = css({
  display: 'flex',
  flexDirection: 'column',
  gap: 'md',
  minWidth: 0,
});

type FieldProps = {
  label?: string;
  /** 상시 안내문. 에러가 표시되는 동안에는 숨긴다. */
  helper?: string;
  /** 에러 메시지. 지정하면 invalid로 간주한다. */
  error?: string;
  /** 메시지 없이 invalid 스타일만 필요할 때 (폼 레벨 에러 등) */
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * 라벨·안내문·에러를 컨트롤에 배선하는 필드 레이아웃.
 * Ark Field가 id, aria-describedby, data-invalid를 하위 컨트롤
 * (Input, NumberInput 등 Field.Input 기반 컨트롤)에 전파한다.
 */
export function Field({ label, helper, error, invalid, required, disabled, className, children }: FieldProps) {
  return (
    <ArkField.Root
      invalid={invalid ?? error !== undefined}
      required={required}
      disabled={disabled}
      className={cx(rootCls, className)}
    >
      {label !== undefined ? (
        <ArkField.Label asChild>
          <Text as="label" variant="label" tone="secondary">
            {label}
          </Text>
        </ArkField.Label>
      ) : null}
      {children}
      {error !== undefined ? (
        <ArkField.ErrorText asChild>
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        </ArkField.ErrorText>
      ) : helper !== undefined ? (
        <ArkField.HelperText asChild>
          <Text variant="caption" tone="tertiary">
            {helper}
          </Text>
        </ArkField.HelperText>
      ) : null}
    </ArkField.Root>
  );
}
