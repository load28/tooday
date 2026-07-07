import { defineRecipe } from '@pandacss/dev';

// config recipe(빌드 전용). 근거: docs/conventions/ui-styling.md.
export const input = defineRecipe({
  className: 'input',
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
    '&[data-invalid], &[aria-invalid="true"]': { borderColor: 'danger' },
  },
  variants: {
    size: {
      sm: { height: 'controlSm', paddingX: 'xl', borderRadius: 'md' },
      md: { height: 'tap', paddingX: 'xl' },
      lg: { height: 'tapLg', paddingX: '2xl' },
      xl: { height: 'tapXl', paddingX: '2xl' },
    },
  },
  defaultVariants: { size: 'md' },
});
