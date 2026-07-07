import type { ReactNode } from 'react';
import { cx } from 'styled-system/css';
import { tabBarIconWrap, tabBarInner, tabBarItem, tabBarNav } from 'styled-system/recipes';

// 스타일은 config recipe(recipes/*의 `tabBar*`). 근거: docs/conventions/ui-styling.md.

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
    <nav {...rest} className={cx(tabBarNav(), className)}>
      <div className={tabBarInner()}>
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
