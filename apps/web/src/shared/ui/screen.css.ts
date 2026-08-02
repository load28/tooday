import { globalStyle, style } from '@vanilla-extract/css';
import { rec } from '@/styles/layers.css';
import { vars } from '@/styles/theme.css';

export const screenViewport = style(
  rec({
    width: '100%',
    // 반응형: base 100vh, sm(≥640px)부터 100dvh
    height: '100vh',
    '@media': { 'screen and (min-width: 640px)': { height: '100dvh' } },
    background: vars.color.bg,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    color: vars.color.text,
    fontFamily: vars.font.sans,
    letterSpacing: vars.letterSpacing.tight,
  }),
);

export const screenHeader = style(rec({ flex: '0 0 auto', background: vars.color.bg, minHeight: vars.size.appBar }));

export const screenContent = style(
  rec({
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  }),
);

export const screenFooter = style(
  rec({ flex: '0 0 auto', background: vars.color.surface, borderTop: `1px solid ${vars.color.divider}` }),
);

export const screenOverlay = style(rec({ position: 'absolute', inset: 0, pointerEvents: 'none' }));
// `& > *`는 자식을 대상으로 하므로 globalStyle로 분리한다(VE는 selector 주체가 &여야 한다)
globalStyle(`${screenOverlay} > *`, rec({ pointerEvents: 'auto' }));
