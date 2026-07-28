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
        position: 'relative',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        // press 딤 — Row 컴포넌트의 whileTap이 --press-dim으로 opacity를 스프링 구동한다(TDS와 동형).
        // hover 색은 없음(TDS ListRow, 모바일 우선). 투명 로우 위에 오버레이를 얹는다.
        _before: {
          content: '""',
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          borderRadius: 'inherit',
          backgroundColor: 'statePressed',
          opacity: 'var(--press-dim, 0)',
        },
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
