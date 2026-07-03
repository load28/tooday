import { type ComponentPropsWithoutRef, useId } from 'react';
import { css, cva, cx } from 'styled-system/css';
import { Text } from '@/shared/ui/text';

const fieldCls = css({
  display: 'flex',
  flexDirection: 'column',
  gap: 'md',
  minWidth: 0,
});

const inputRecipe = cva({
  base: {
    width: '100%',
    height: 'tapXl',
    paddingX: '2xl',
    borderRadius: 'lg',
    border: '1.5px solid transparent',
    bg: 'surfaceSoft',
    color: 'text',
    // 16px 미만이면 iOS 웹뷰가 포커스 시 자동 확대한다
    fontSize: '16px',
    fontWeight: '500',
    letterSpacing: 'tight',
    outline: 'none',
    transition: 'border-color {durations.fast} {easings.exit}, background-color {durations.fast} {easings.exit}',
    _placeholder: { color: 'textPlaceholder' },
    _focus: { bg: 'surface', borderColor: 'primary' },
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
  },
  variants: {
    invalid: {
      true: {
        borderColor: 'danger',
        _focus: { borderColor: 'danger' },
      },
    },
  },
});

type TextFieldBase = {
  label?: string;
  error?: string;
  className?: string;
};

type TextFieldProps = TextFieldBase & Omit<ComponentPropsWithoutRef<'input'>, keyof TextFieldBase>;

export function TextField({ label, error, className, id, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={cx(fieldCls, className)}>
      {label !== undefined ? (
        <Text as="label" htmlFor={inputId} variant="label" tone="secondary">
          {label}
        </Text>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error !== undefined ? true : undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        {...rest}
        className={inputRecipe({ invalid: error !== undefined })}
      />
      {error !== undefined ? (
        <Text id={errorId} variant="caption" tone="danger" role="alert">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
