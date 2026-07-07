import type { ReactNode } from 'react';
import { css, cx } from 'styled-system/css';
import { tabBarIconWrap, tabBarItem } from 'styled-system/recipes';

// 아이템/아이콘 스타일은 config recipe(panda.recipes.ts의 `tabBarItem`/`tabBarIconWrap`).
// 근거: docs/conventions/ui-styling.md.

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
              className={tabBarItem({ active: isActive })}
            >
              <span className={tabBarIconWrap({ active: isActive })}>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
