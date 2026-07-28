import { defineRecipe } from '@pandacss/dev';

export const sheetPositioner = defineRecipe({
  className: 'sheetPositioner',
  base: { position: 'fixed', inset: 0, zIndex: 'overlay', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
});

export const sheetBackdrop = defineRecipe({
  className: 'sheetBackdrop',
  base: {
    position: 'fixed',
    inset: 0,
    zIndex: 'overlay',
    background: 'overlay',
    animation: 'toodayFadeIn {durations.base} {easings.standard}',
  },
});

export const sheetSurface = defineRecipe({
  className: 'sheetSurface',
  base: {
    position: 'relative',
    width: '100%',
    bg: 'surface',
    borderTopLeftRadius: '3xl',
    borderTopRightRadius: '3xl',
    paddingTop: 'sheetHandleTop',
    paddingX: 'sheetPadX',
    paddingBottom: 'sheetPadBottom',
    display: 'flex',
    flexDirection: 'column',
    gap: 'sheetGap',
    boxShadow: 'sheet',
    animation: 'toodaySlideUp {durations.slow} {easings.standard}',
    maxHeight: '85%',
    overflowY: 'auto',
  },
});

export const sheetHandle = defineRecipe({
  className: 'sheetHandle',
  base: {
    width: 'handle',
    height: 'xs',
    borderRadius: 'pill',
    bg: 'borderStrong',
    alignSelf: 'center',
    marginBottom: 'xs',
    flex: '0 0 auto',
  },
});
