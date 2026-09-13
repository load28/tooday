import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import type { SlotSx } from '@/styles/sx';
import { text } from '@/styles/text.styles';
import { color, size as sizeVars, space } from '@/styles/tokens.stylex';

const styles = stylex.create({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBlock: space.appBarPadY,
    paddingInline: space.appBarPadX,
    gap: space.appBarGap,
    minHeight: sizeVars.appBar,
  },
  side: { display: 'flex', alignItems: 'center', gap: space.xs, flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  title: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    minWidth: 0,
    color: color.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

type AppBarSlotProps = {
  children?: ReactNode;
  sx?: SlotSx;
};

function AppBarRoot({ children, sx }: AppBarSlotProps) {
  const { className: c, style } = stylex.props(styles.root, sx);
  return (
    <header className={c} style={style}>
      {children}
    </header>
  );
}

function AppBarLeading({ children, sx }: AppBarSlotProps) {
  const { className: c, style } = stylex.props(styles.side, sx);
  return (
    <div className={c} style={style}>
      {children}
    </div>
  );
}

function AppBarTitle({ children, sx }: AppBarSlotProps) {
  const { className: c, style } = stylex.props(text.subtitle, styles.title, sx);
  return (
    <span className={c} style={style}>
      {children}
    </span>
  );
}

function AppBarTrailing({ children, sx }: AppBarSlotProps) {
  const { className: c, style } = stylex.props(styles.side, sx);
  return (
    <div className={c} style={style}>
      {children}
    </div>
  );
}

export const AppBar = Object.assign(AppBarRoot, {
  Leading: AppBarLeading,
  Title: AppBarTitle,
  Trailing: AppBarTrailing,
});
