import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { BaseButton } from '@/shared/ui/base-button';
import type { ControlSx } from '@/styles/sx';
import { text } from '@/styles/text.styles';
import { anim, color, radii, size as sizeVars, space } from '@/styles/tokens.stylex';

const styles = stylex.create({
  nav: { paddingBottom: space.md },
  inner: {
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: '1fr',
    height: sizeVars.tabBar,
    paddingTop: space.md,
  },
  iconWrap: {
    width: sizeVars.tapXl,
    height: '1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    transitionProperty: 'background-color',
    transitionDuration: anim.durationSlow,
    transitionTimingFunction: anim.easingStandard,
  },
  iconWrapActive: { backgroundColor: color.primarySoft },
  // 탭 고유 레이아웃·활성 색만 — 리셋·포커스 링은 BaseButton이 제공한다.
  item: {
    flexDirection: 'column',
    gap: space['2xs'],
    transitionProperty: 'color',
    transitionDuration: anim.durationBase,
    transitionTimingFunction: anim.easingStandard,
  },
  itemActive: { color: color.primary, fontWeight: 700 },
  itemIdle: { color: color.textTertiary },
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
  sx?: ControlSx;
  className?: string;
};

export function TabBar<K extends string>({ items, activeKey, onSelect, sx, className, ...rest }: TabBarProps<K>) {
  const { className: navClassName, style } = stylex.props(styles.nav, sx);
  return (
    <nav {...rest} className={className ? `${navClassName} ${className}` : navClassName} style={style}>
      <div {...stylex.props(styles.inner)}>
        {items.map(({ key, label, icon }) => {
          const isActive = key === activeKey;
          return (
            <BaseButton
              key={key}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect?.(key)}
              sx={[styles.item, text.micro, isActive ? styles.itemActive : styles.itemIdle]}
            >
              <span {...stylex.props(styles.iconWrap, isActive && styles.iconWrapActive)}>{icon}</span>
              <span>{label}</span>
            </BaseButton>
          );
        })}
      </div>
    </nav>
  );
}
