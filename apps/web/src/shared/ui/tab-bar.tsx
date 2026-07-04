import type { ReactNode } from 'react';
import { css, cva, cx } from 'styled-system/css';

const navCls = css({
  paddingBottom: 'md',
});

const innerCls = css({
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '1fr',
  height: 'tabBar',
  paddingTop: 'md',
});

const itemRecipe = cva({
  base: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2xs',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textStyle: 'micro',
    padding: 0,
    transition: 'color {durations.base} {easings.standard}',
    _focusVisible: { outline: 'none', boxShadow: 'focus' },
  },
  variants: {
    active: {
      true: { color: 'primary', fontWeight: 700 },
      false: { color: 'textTertiary' },
    },
  },
});

const iconWrapRecipe = cva({
  base: {
    width: 'tapXl',
    height: '1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'pill',
    transition: 'background {durations.slow} {easings.standard}',
  },
  variants: {
    active: {
      true: { bg: 'primarySoft' },
      false: {},
    },
  },
});

type TabBarItem<K extends string> = {
  key: K;
  label: string;
  icon: ReactNode;
};

type TabBarProps<K extends string> = {
  items: TabBarItem<K>[];
  activeKey: K;
  onSelect?: (key: K) => void;
  'aria-label'?: string;
  className?: string;
};

export function TabBar<K extends string>({ items, activeKey, onSelect, className, ...rest }: TabBarProps<K>) {
  return (
    <nav {...rest} className={cx(navCls, className)}>
      <div className={innerCls}>
        {items.map(({ key, label, icon }) => {
          const isActive = key === activeKey;
          return (
            <button
              key={key}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect?.(key)}
              className={itemRecipe({ active: isActive })}
            >
              <span className={iconWrapRecipe({ active: isActive })}>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
