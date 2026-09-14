import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import type { SlotSx } from '@/styles/sx';
import { color, font, size as sizeVars, tracking } from '@/styles/tokens.stylex';

const styles = stylex.create({
  viewport: {
    width: '100%',
    // 반응형: base 100vh, sm(≥640px)부터 100dvh
    height: { default: '100vh', '@media screen and (min-width: 640px)': '100dvh' },
    backgroundColor: color.bg,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    color: color.text,
    fontFamily: font.sans,
    letterSpacing: tracking.tight,
  },
  header: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', backgroundColor: color.bg, minHeight: sizeVars.appBar },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  },
  footer: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    backgroundColor: color.surface,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.divider,
  },
  overlay: { position: 'absolute', inset: 0, pointerEvents: 'none' },
});

type ScreenSlotProps = {
  children?: ReactNode;
  sx?: SlotSx;
};

/** 화면 뷰포트(세로 flex 컨테이너). 헤더·본문·푸터를 이 순서로 담는다. */
function ScreenRoot({ children, sx }: ScreenSlotProps) {
  return <div {...stylex.props(styles.viewport, sx)}>{children}</div>;
}

function ScreenHeader({ children, sx }: ScreenSlotProps) {
  return <header {...stylex.props(styles.header, sx)}>{children}</header>;
}

/** 유일한 스크롤 영역. 화면 단위 스크롤 위치를 갖는다. */
function ScreenContent({ children, sx }: ScreenSlotProps) {
  return <main {...stylex.props(styles.content, sx)}>{children}</main>;
}

/**
 * 자식만 클릭을 받는 투명 레이어. 자식의 pointer-events 복구는 StyleX가 다룰 수 없는
 * 자식 셀렉터라 global.css의 `[data-screen-overlay] > *` 한 줄이 맡는다.
 */
function ScreenOverlay({ children, sx }: ScreenSlotProps) {
  return (
    <div data-screen-overlay="" {...stylex.props(styles.overlay, sx)}>
      {children}
    </div>
  );
}

function ScreenFooter({ children, sx }: ScreenSlotProps) {
  return <footer {...stylex.props(styles.footer, sx)}>{children}</footer>;
}

type ScreenProps = {
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  overlay?: ReactNode;
  children?: ReactNode;
  sx?: SlotSx;
};

/**
 * 한 라우트가 화면 전체(뷰포트 포함)를 소유할 때 쓰는 조합.
 *
 * 뷰포트·푸터를 레이아웃이 소유하고 화면은 헤더·본문만 그리는 경우(탭 화면들 —
 * `routes/_app/_tabs`)는 이 조합 대신 `Screen.Root`/`Header`/`Content`/`Footer`
 * 파트를 직접 조립한다.
 */
function ScreenBase({ topBar, bottomBar, overlay, children, sx }: ScreenProps) {
  return (
    <ScreenRoot sx={sx}>
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
