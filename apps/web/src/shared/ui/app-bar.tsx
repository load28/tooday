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
  return <header {...stylex.props(styles.root, sx)}>{children}</header>;
}

function AppBarLeading({ children, sx }: AppBarSlotProps) {
  return <div {...stylex.props(styles.side, sx)}>{children}</div>;
}

function AppBarTitle({ children, sx }: AppBarSlotProps) {
  return <span {...stylex.props(text.subtitle, styles.title, sx)}>{children}</span>;
}

function AppBarTrailing({ children, sx }: AppBarSlotProps) {
  return <div {...stylex.props(styles.side, sx)}>{children}</div>;
}

export const AppBar = Object.assign(AppBarRoot, {
  Leading: AppBarLeading,
  Title: AppBarTitle,
  Trailing: AppBarTrailing,
});
