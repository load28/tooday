import { defineRecipe } from '@pandacss/dev';

export const spinner = defineRecipe({
  className: 'spinner',
  base: {
    display: 'inline-block',
    flexShrink: 0,
    width: '1em',
    height: '1em',
    borderRadius: 'full',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'currentcolor',
    borderBottomColor: 'transparent',
    animation: 'toodaySpin 0.6s linear infinite',
  },
});
