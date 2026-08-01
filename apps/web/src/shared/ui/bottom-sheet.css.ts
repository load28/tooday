import { recipe } from '@vanilla-extract/recipes';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const sheetPositioner = recipe({
  base: rec({
    position: 'fixed',
    inset: 0,
    zIndex: vars.zIndex.overlay,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  }),
});

export const sheetBackdrop = recipe({
  base: rec({
    position: 'fixed',
    inset: 0,
    zIndex: vars.zIndex.overlay,
    background: vars.color.overlay,
    animation: `toodayFadeIn ${vars.duration.base} ${vars.easing.standard}`,
  }),
});

export const sheetSurface = recipe({
  base: rec({
    position: 'relative',
    width: '100%',
    background: vars.color.surface,
    borderTopLeftRadius: vars.radii['3xl'],
    borderTopRightRadius: vars.radii['3xl'],
    paddingTop: vars.space.sheetHandleTop,
    paddingInline: vars.space.sheetPadX,
    paddingBottom: vars.space.sheetPadBottom,
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space.sheetGap,
    boxShadow: vars.shadow.sheet,
    animation: `toodaySlideUp ${vars.duration.slow} ${vars.easing.standard}`,
    maxHeight: '85%',
    overflowY: 'auto',
  }),
});

export const sheetHandle = recipe({
  base: rec({
    width: vars.size.handle,
    height: vars.size.xs,
    borderRadius: vars.radii.pill,
    background: vars.color.borderStrong,
    alignSelf: 'center',
    marginBottom: vars.space.xs,
    flex: '0 0 auto',
  }),
});
