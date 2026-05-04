import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { TOKENS } from '@/lib/tokens';
import { IconCalendar, IconChevronLeft, IconGrid, IconPlus, IconSparkle } from './icons';

export const shellStyles: Record<string, CSSProperties> = {
  viewport: {
    width: '100%',
    height: '100vh',
    background: TOKENS.color.bg,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: TOKENS.font.body,
    color: TOKENS.color.textPrimary,
    position: 'relative',
    overflow: 'hidden',
    letterSpacing: '-0.01em',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 20px 6px 12px',
    background: TOKENS.color.bg,
    minHeight: 52,
    flex: '0 0 auto',
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: 4 },
  topBarTitle: { fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' },
  topBarBtn: {
    width: 40,
    height: 40,
    border: 'none',
    background: 'transparent',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: TOKENS.color.textPrimary,
    cursor: 'pointer',
  },
  content: { flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' },
  tabBar: {
    flex: '0 0 auto',
    background: TOKENS.color.surface,
    borderTop: `1px solid ${TOKENS.color.divider}`,
    paddingBottom: 8,
    position: 'relative',
  },
  tabInner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    height: 60,
    paddingTop: 8,
  },
  tabItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: TOKENS.color.textTertiary,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: 'inherit',
    position: 'relative',
    padding: 0,
    transition: 'color 160ms ease',
  },
  tabItemActive: { color: TOKENS.color.primary, fontWeight: 700 },
  tabIconWrap: {
    width: 56,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    transition: 'background 200ms ease',
  },
  tabIconActiveBg: { background: TOKENS.color.primarySoft },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 84,
    width: 56,
    height: 56,
    borderRadius: 999,
    background: TOKENS.color.primary,
    color: '#fff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: TOKENS.shadow.fab,
    cursor: 'pointer',
    transition: 'transform 120ms ease',
    zIndex: 5,
  },
};

type TopBarProps = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  transparent?: boolean;
};

export function TopBar({ title, showBack, onBack, right, transparent }: TopBarProps) {
  return (
    <header style={{ ...shellStyles.topBar, background: transparent ? 'transparent' : TOKENS.color.bg }}>
      <div style={shellStyles.topBarLeft}>
        {showBack ? (
          <button type="button" style={shellStyles.topBarBtn} onClick={onBack} aria-label="뒤로">
            <IconChevronLeft size={24} strokeWidth={2.2} />
          </button>
        ) : (
          <div style={{ width: 12 }} />
        )}
        <span style={shellStyles.topBarTitle}>{title}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>{right}</div>
    </header>
  );
}

export type TabKey = 'time' | 'projects' | 'guide';

type BottomTabProps = { active?: TabKey; onChange?: (k: TabKey) => void };

export function BottomTab({ active, onChange }: BottomTabProps) {
  const items: { key: TabKey; label: string; Icon: typeof IconCalendar }[] = [
    { key: 'time', label: '시간', Icon: IconCalendar },
    { key: 'projects', label: '프로젝트', Icon: IconGrid },
    { key: 'guide', label: '가이드', Icon: IconSparkle },
  ];
  return (
    <nav style={shellStyles.tabBar} aria-label="주요 메뉴">
      <div style={shellStyles.tabInner}>
        {items.map(({ key, label, Icon: I }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange?.(key)}
              style={{ ...shellStyles.tabItem, ...(isActive ? shellStyles.tabItemActive : {}) }}
            >
              <span style={{ ...shellStyles.tabIconWrap, ...(isActive ? shellStyles.tabIconActiveBg : {}) }}>
                <I size={22} strokeWidth={isActive ? 2.4 : 1.8} />
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

type FabProps = { onClick?: () => void; label?: string };

export function Fab({ onClick, label = '태스크 추가' }: FabProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      style={{ ...shellStyles.fab, transform: pressed ? 'scale(0.94)' : 'scale(1)' }}
    >
      <IconPlus size={26} strokeWidth={2.6} />
    </button>
  );
}

type MobileShellProps = {
  topBar?: ReactNode;
  children: ReactNode;
  tab?: TabKey;
  onTabChange?: (k: TabKey) => void;
  showTab?: boolean;
  showFab?: boolean;
  onFab?: () => void;
  contentBg?: string;
};

export function MobileShell({
  topBar,
  children,
  tab,
  onTabChange,
  showTab = true,
  showFab = true,
  onFab,
  contentBg,
}: MobileShellProps) {
  return (
    <div style={{ ...shellStyles.viewport, background: contentBg ?? TOKENS.color.bg }}>
      {topBar}
      <main style={shellStyles.content}>{children}</main>
      {showFab ? <Fab onClick={onFab} /> : null}
      {showTab ? <BottomTab active={tab} onChange={onTabChange} /> : null}
    </div>
  );
}
