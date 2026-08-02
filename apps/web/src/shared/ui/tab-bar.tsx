import type { ReactNode } from 'react';
import { BaseButton } from '@/shared/ui/base-button';
import { tabBarIconWrap, tabBarInner, tabBarItem, tabBarNav } from '@/shared/ui/tab-bar.css';
import { cx } from '@/styles/cx';

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
            <BaseButton
              key={key}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect?.(key)}
              className={tabBarItem({ active: isActive })}
            >
              <span className={tabBarIconWrap({ active: isActive })}>{icon}</span>
              <span>{label}</span>
            </BaseButton>
          );
        })}
      </div>
    </nav>
  );
}
