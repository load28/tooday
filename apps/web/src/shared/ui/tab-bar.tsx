import type { ReactNode } from 'react';
import { cva, cx } from 'styled-system/css';
import { tabBarIconWrap, tabBarInner, tabBarNav } from 'styled-system/recipes';
import { BaseButton } from '@/shared/ui/base-button';

// 탭 고유 레이아웃·활성 색만 — 리셋·포커스 링은 BaseButton이 제공한다.
const tabBarItem = cva({
  base: {
    flexDirection: 'column',
    gap: '2xs',
    textStyle: 'micro',
    transition: 'color {durations.base} {easings.standard}',
  },
  variants: {
    active: {
      true: { color: 'primary', fontWeight: 700 },
      false: { color: 'textTertiary' },
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
