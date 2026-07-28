import { defineRecipe } from '@pandacss/dev';

export const row = defineRecipe({
  className: 'row',
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: 'xl',
    minWidth: 0,
    width: '100%',
    color: 'text',
    textAlign: 'left',
    transition: 'background-color {durations.fast} {easings.exit}',
    _press: { transitionDuration: '0ms' },
  },
  variants: {
    density: {
      compact: { paddingX: 'xl', paddingY: 'md', minHeight: 'tap' },
      comfortable: { paddingX: '2xl', paddingY: 'xl', minHeight: 'tapLg' },
      spacious: { paddingX: '2xl', paddingY: '2xl', minHeight: 'tapXl' },
    },
    align: {
      center: { alignItems: 'center' },
      start: { alignItems: 'flex-start' },
    },
    interactive: {
      true: {
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        // Row는 투명 배경이라 state layer를 bg로 바로 얹는다(카드와 달리 오버레이 불필요).
        _hover: { bg: 'stateHover' },
        _press: { bg: 'statePressed' },
        _focusVisible: { outline: 'none', boxShadow: 'focus' },
      },
    },
    inset: {
      none: {},
      flush: { paddingX: '0' },
    },
  },
  defaultVariants: { density: 'comfortable', align: 'center', inset: 'none' },
});

export const rowSlotLeading = defineRecipe({
  className: 'rowSlotLeading',
  base: { flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' },
});

export const rowSlotContent = defineRecipe({
  className: 'rowSlotContent',
  base: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2xs', justifyContent: 'center' },
});

export const rowSlotTrailing = defineRecipe({
  className: 'rowSlotTrailing',
  base: { flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 'md', color: 'textTertiary' },
});
