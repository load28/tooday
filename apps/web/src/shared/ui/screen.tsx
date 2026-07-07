import type { ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { screenContent, screenFooter, screenHeader, screenOverlay, screenViewport } from 'styled-system/recipes';

type ScreenProps = {
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  overlay?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Screen({ topBar, bottomBar, overlay, children, className }: ScreenProps) {
  return (
    <div className={cx(screenViewport(), className)}>
      {topBar != null ? <header className={screenHeader()}>{topBar}</header> : null}
      <main className={screenContent()}>{children}</main>
      {overlay != null ? <div className={screenOverlay()}>{overlay}</div> : null}
      {bottomBar != null ? <footer className={screenFooter()}>{bottomBar}</footer> : null}
    </div>
  );
}
