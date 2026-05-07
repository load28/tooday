import type { ReactNode } from 'react';
import { css, cx } from 'styled-system/css';

const viewportCls = css({
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
  paddingLeft: 'safeLeft',
  paddingRight: 'safeRight',
});

const headerCls = css({
  flex: '0 0 auto',
  bg: 'bg',
  minHeight: 'appBar',
  paddingTop: 'safeTop',
});

const contentCls = css({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
});

const footerCls = css({
  flex: '0 0 auto',
  bg: 'surface',
  borderTop: '1px solid {colors.divider}',
  paddingBottom: 'safeBottom',
});

const overlayCls = css({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  '& > *': { pointerEvents: 'auto' },
});

type ScreenProps = {
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  overlay?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Screen({ topBar, bottomBar, overlay, children, className }: ScreenProps) {
  return (
    <div className={cx(viewportCls, className)}>
      {topBar != null ? <header className={headerCls}>{topBar}</header> : null}
      <main className={contentCls}>{children}</main>
      {overlay != null ? <div className={overlayCls}>{overlay}</div> : null}
      {bottomBar != null ? <footer className={footerCls}>{bottomBar}</footer> : null}
    </div>
  );
}
