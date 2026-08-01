import type { ReactNode } from 'react';
import { appBarLeading, appBarRoot, appBarTitle, appBarTrailing } from '@/shared/ui/app-bar.css';
import { cx } from '@/styles/cx';

type AppBarRootProps = {
  children?: ReactNode;
  className?: string;
};

type AppBarSlotProps = {
  children?: ReactNode;
  className?: string;
};

function AppBarRoot({ children, className }: AppBarRootProps) {
  return <header className={cx(appBarRoot(), className)}>{children}</header>;
}

function AppBarLeading({ children, className }: AppBarSlotProps) {
  return <div className={cx(appBarLeading(), className)}>{children}</div>;
}

function AppBarTitle({ children, className }: AppBarSlotProps) {
  return <span className={cx(appBarTitle(), className)}>{children}</span>;
}

function AppBarTrailing({ children, className }: AppBarSlotProps) {
  return <div className={cx(appBarTrailing(), className)}>{children}</div>;
}

export const AppBar = Object.assign(AppBarRoot, {
  Leading: AppBarLeading,
  Title: AppBarTitle,
  Trailing: AppBarTrailing,
});
