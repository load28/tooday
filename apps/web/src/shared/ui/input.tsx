import { Field as ArkField } from '@ark-ui/react/field';
import type { ComponentPropsWithRef } from 'react';
import { cva, cx } from 'styled-system/css';

/**
 * 텍스트 계열 입력 컨트롤의 공용 recipe.
 * Field 안에서는 Ark가 data-invalid를 전파하고, 단독 사용 시에는
 * 컨트롤이 직접 aria-invalid를 설정한다 — 둘 다 같은 셀렉터로 스타일링된다.
 */
const inputRecipe = cva({
  base: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    appearance: 'none',
    border: '1.5px solid transparent',
    borderRadius: 'lg',
    bg: 'surfaceSoft',
    color: 'text',
    fontFamily: 'inherit',
    letterSpacing: 'tight',
    fontWeight: '500',
    // 16px 미만이면 iOS 웹뷰가 포커스 시 화면을 자동 확대한다
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color {durations.fast} {easings.exit}, background-color {durations.fast} {easings.exit}',
    _placeholder: { color: 'textPlaceholder' },
    _focus: { bg: 'surface', borderColor: 'primary' },
    _disabled: { cursor: 'not-allowed', opacity: 0.5 },
    '&[data-invalid], &[aria-invalid="true"]': {
      borderColor: 'danger',
    },
  },
  variants: {
    size: {
      sm: { height: 'controlSm', paddingX: 'xl', borderRadius: 'md' },
      md: { height: 'tap', paddingX: 'xl' },
      lg: { height: 'tapLg', paddingX: '2xl' },
      xl: { height: 'tapXl', paddingX: '2xl' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type InputSize = NonNullable<NonNullable<Parameters<typeof inputRecipe>[0]>['size']>;

type InputOwnProps = {
  size?: InputSize;
  className?: string;
};

type InputProps = InputOwnProps & Omit<ComponentPropsWithRef<'input'>, keyof InputOwnProps>;

/** Field 컨텍스트가 있으면 id·aria 배선을 물려받고, 없으면 일반 input으로 동작한다. */
export function Input({ size, className, ...rest }: InputProps) {
  return <ArkField.Input {...rest} className={cx(inputRecipe({ size }), className)} />;
}
