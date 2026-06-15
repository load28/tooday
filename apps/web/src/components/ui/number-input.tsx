import { type ComponentPropsWithoutRef, useCallback, useState } from 'react';
import { cva, cx } from 'styled-system/css';

const numberInputRecipe = cva({
  base: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    border: '1px solid {colors.border}',
    borderRadius: 'md',
    bg: 'surface',
    color: 'text',
    fontFamily: 'inherit',
    letterSpacing: 'inherit',
    outline: 'none',
    transition: 'border-color {durations.fast} {easings.standard}, box-shadow {durations.fast} {easings.standard}',
    _focus: {
      borderColor: 'primary',
      boxShadow: 'focus',
    },
    _disabled: {
      cursor: 'not-allowed',
      opacity: 0.5,
      bg: 'surfaceMuted',
    },
    _placeholder: {
      color: 'textPlaceholder',
    },
  },
  variants: {
    size: {
      sm: {
        height: 'controlSm',
        paddingInline: 'xl',
        textStyle: 'bodySm',
      },
      md: {
        height: 'tap',
        paddingInline: 'xl',
        textStyle: 'body',
      },
      lg: {
        height: 'tapLg',
        paddingInline: '2xl',
        textStyle: 'bodyLg',
      },
    },
    tone: {
      default: {},
      danger: {
        borderColor: 'danger',
        _focus: {
          borderColor: 'danger',
          boxShadow: '0 0 0 3px {colors.dangerSoft}',
        },
      },
    },
  },
  defaultVariants: {
    size: 'md',
    tone: 'default',
  },
});

type NumberInputOwnProps = {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'danger';
  className?: string;
};

type NumberInputProps = NumberInputOwnProps & Omit<ComponentPropsWithoutRef<'input'>, keyof NumberInputOwnProps | 'type'>;

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

export function NumberInput({
  value,
  defaultValue,
  onChange,
  min,
  max,
  step = 1,
  size,
  tone,
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
  const resolvedTone = tone ?? (outOfRange ? 'danger' : 'default');

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
    <input
      {...rest}
      type="number"
      inputMode="numeric"
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cx(numberInputRecipe({ size, tone: resolvedTone }), className)}
    />
  );
}
