import type { ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { screenContent, screenFooter, screenHeader, screenOverlay, screenViewport } from 'styled-system/recipes';

type ScreenSlotProps = {
  children?: ReactNode;
  className?: string;
};

/** 화면 뷰포트(세로 flex 컨테이너). 헤더·본문·푸터를 이 순서로 담는다. */
function ScreenRoot({ children, className }: ScreenSlotProps) {
  return <div className={cx(screenViewport(), className)}>{children}</div>;
}

function ScreenHeader({ children, className }: ScreenSlotProps) {
  return <header className={cx(screenHeader(), className)}>{children}</header>;
}

/** 유일한 스크롤 영역. 화면 단위 스크롤 위치를 갖는다. */
function ScreenContent({ children, className }: ScreenSlotProps) {
  return <main className={cx(screenContent(), className)}>{children}</main>;
}

function ScreenOverlay({ children, className }: ScreenSlotProps) {
  return <div className={cx(screenOverlay(), className)}>{children}</div>;
}

function ScreenFooter({ children, className }: ScreenSlotProps) {
  return <footer className={cx(screenFooter(), className)}>{children}</footer>;
}

type ScreenProps = {
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  overlay?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * 한 라우트가 화면 전체(뷰포트 포함)를 소유할 때 쓰는 조합.
 *
 * 뷰포트·푸터를 레이아웃이 소유하고 화면은 헤더·본문만 그리는 경우(탭 화면들 —
 * `routes/_app/_tabs`)는 이 조합 대신 `Screen.Root`/`Header`/`Content`/`Footer`
 * 파트를 직접 조립한다.
 */
function ScreenBase({ topBar, bottomBar, overlay, children, className }: ScreenProps) {
  return (
    <ScreenRoot className={className}>
      {topBar != null ? <ScreenHeader>{topBar}</ScreenHeader> : null}
      <ScreenContent>{children}</ScreenContent>
      {overlay != null ? <ScreenOverlay>{overlay}</ScreenOverlay> : null}
      {bottomBar != null ? <ScreenFooter>{bottomBar}</ScreenFooter> : null}
    </ScreenRoot>
  );
}

export const Screen = Object.assign(ScreenBase, {
  Root: ScreenRoot,
  Header: ScreenHeader,
  Content: ScreenContent,
  Overlay: ScreenOverlay,
  Footer: ScreenFooter,
});
