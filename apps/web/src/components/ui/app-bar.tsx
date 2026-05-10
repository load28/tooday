import type { ReactNode } from 'react';
import { css, cx } from 'styled-system/css';

const barCls = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBlock: 'appBarPadY',
  paddingInline: 'appBarPadX',
  gap: 'appBarGap',
  minHeight: 'appBar',
});

const leadingCls = css({
  display: 'flex',
  alignItems: 'center',
  gap: 'xs',
  flex: '0 0 auto',
});

const titleCls = css({
  flex: 1,
  minWidth: 0,
  textStyle: 'subtitle',
  color: 'text',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const trailingCls = css({
  display: 'flex',
  alignItems: 'center',
  gap: 'xs',
  flex: '0 0 auto',
});

type AppBarRootProps = {
  children?: ReactNode;
  className?: string;
};

type AppBarSlotProps = {
  children?: ReactNode;
  className?: string;
};

function AppBarRoot({ children, className }: AppBarRootProps) {
  return <header className={cx(barCls, className)}>{children}</header>;
}

function AppBarLeading({ children, className }: AppBarSlotProps) {
  return <div className={cx(leadingCls, className)}>{children}</div>;
}

function AppBarTitle({ children, className }: AppBarSlotProps) {
  return <span className={cx(titleCls, className)}>{children}</span>;
}

function AppBarTrailing({ children, className }: AppBarSlotProps) {
  return <div className={cx(trailingCls, className)}>{children}</div>;
}

export const AppBar = Object.assign(AppBarRoot, {
  Leading: AppBarLeading,
  Title: AppBarTitle,
  Trailing: AppBarTrailing,
});
