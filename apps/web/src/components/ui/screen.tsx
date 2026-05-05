import type { ReactNode } from 'react';
import { css, cx } from 'styled-system/css';

/**
 * Screen — 모바일 뷰포트 셸. 상단/하단 바가 고정되고 가운데가 스크롤되는 표준 모바일 레이아웃.
 * 이 안에서 화면 콘텐츠는 항상 스크롤 영역에 위치한다.
 */
const viewportCls = css({
  width: '100%',
  // URL바가 표시/숨김될 때 점프하지 않도록 dvh 사용 (iOS 16+/Android 모두 지원)
  height: ['100vh', '100dvh'],
  bg: 'bg',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  color: 'text',
  fontFamily: 'sans',
  letterSpacing: 'tight',
  // 안전 영역(노치/홈바) 좌우 패딩
  paddingLeft: 'safeLeft',
  paddingRight: 'safeRight',
});

const headerCls = css({
  flex: '0 0 auto',
  bg: 'bg',
  minHeight: 'appBar',
  // 노치 영역만큼 위로 밀어내기
  paddingTop: 'safeTop',
});

const contentCls = css({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  // 스크롤 컨테이너는 고무줄 차단
  overscrollBehavior: 'contain',
});

const footerCls = css({
  flex: '0 0 auto',
  bg: 'surface',
  borderTop: '1px solid {colors.divider}',
  // 홈바 영역만큼 아래로 밀어내기
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
