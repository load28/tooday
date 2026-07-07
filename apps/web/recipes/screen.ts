import { defineRecipe } from '@pandacss/dev';

export const screenViewport = defineRecipe({
  className: 'screenViewport',
  base: {
    width: '100%',
    height: ['100vh', '100dvh'],
    bg: 'bg',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    color: 'text',
    fontFamily: 'sans',
    letterSpacing: 'tight',
  },
});

export const screenHeader = defineRecipe({
  className: 'screenHeader',
  base: { flex: '0 0 auto', bg: 'bg', minHeight: 'appBar' },
});

export const screenContent = defineRecipe({
  className: 'screenContent',
  base: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  },
});

export const screenFooter = defineRecipe({
  className: 'screenFooter',
  base: { flex: '0 0 auto', bg: 'surface', borderTop: '1px solid {colors.divider}' },
});

export const screenOverlay = defineRecipe({
  className: 'screenOverlay',
  base: { position: 'absolute', inset: 0, pointerEvents: 'none', '& > *': { pointerEvents: 'auto' } },
});
