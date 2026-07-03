import { Field as ArkField } from '@ark-ui/react/field';
import { type ComponentPropsWithRef, useCallback, useState } from 'react';
import { cx } from 'styled-system/css';
import { type InputSize, inputRecipe } from '@/shared/ui/input';

type NumberInputOwnProps = {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: InputSize;
  /** 미지정 시 min/max 범위를 벗어나면 자동으로 invalid 처리한다 */
  invalid?: boolean;
  className?: string;
};

type NumberInputProps = NumberInputOwnProps & Omit<ComponentPropsWithRef<'input'>, keyof NumberInputOwnProps | 'type'>;

function clamp(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
}

function isOutOfRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return true;
  if (max !== undefined && value > max) return true;
  return false;
}

/** Input과 recipe를 공유하는 숫자 컨트롤. Field 안에서는 id·aria 배선을 물려받는다. */
export function NumberInput({
  value,
  defaultValue,
  onChange,
  min,
  max,
  step = 1,
  size,
  invalid,
  className,
  disabled,
  onBlur,
  ...rest
}: NumberInputProps) {
  const isControlled = value !== undefined;

  const [internalValue, setInternalValue] = useState<string>(defaultValue !== undefined ? String(defaultValue) : '');

  const displayValue = isControlled ? String(value) : internalValue;

  const numericValue = Number.parseFloat(displayValue);
  const outOfRange = !Number.isNaN(numericValue) && isOutOfRange(numericValue, min, max);
  const showInvalid = invalid ?? outOfRange;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      if (!isControlled) {
        setInternalValue(raw);
      }

      const parsed = Number.parseFloat(raw);
      if (raw !== '' && !Number.isNaN(parsed)) {
        onChange?.(parsed);
      }
    },
    [isControlled, onChange],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = Number.parseFloat(e.target.value);
      if (!Number.isNaN(parsed)) {
        const clamped = clamp(parsed, min, max);
        if (clamped !== parsed) {
          if (!isControlled) {
            setInternalValue(String(clamped));
          }
          onChange?.(clamped);
        }
      }
      onBlur?.(e);
    },
    [isControlled, min, max, onChange, onBlur],
  );

  return (
    <ArkField.Input
      {...rest}
      {...(showInvalid ? { 'aria-invalid': true } : {})}
      type="number"
      inputMode="numeric"
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cx(inputRecipe({ size }), className)}
    />
  );
}
