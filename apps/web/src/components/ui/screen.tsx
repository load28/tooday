import type { ReactNode } from 'react';
import { css, cx } from 'styled-system/css';

/**
 * Screen — 모바일 뷰포트 셸. 상단/하단 바가 고정되고 가운데가 스크롤되는 표준 모바일 레이아웃.
 * 이 안에서 화면 콘텐츠는 항상 스크롤 영역에 위치한다.
 */
const viewportCls = css({
  width: '100%',
  height: '100vh',
  bg: 'bg',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  color: 'text',
  fontFamily: 'sans',
  letterSpacing: 'tight',
});

const headerCls = css({
  flex: '0 0 auto',
  bg: 'bg',
  minHeight: 'appBar',
});

const contentCls = css({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
});

const footerCls = css({
  flex: '0 0 auto',
  bg: 'surface',
  borderTop: '1px solid {colors.divider}',
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
  /** 떠있는 액션 (FAB, 토스트 등) — 스크롤과 별개로 고정 */
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
