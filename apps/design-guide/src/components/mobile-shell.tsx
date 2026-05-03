import { Link, useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { CalendarClock, ChevronLeft, LayoutGrid, Plus, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import * as styles from './mobile-shell.css';

type TopBarProps = {
  title: string;
  showBack?: boolean;
  right?: ReactNode;
};

export function TopBar({ title, showBack, right }: TopBarProps) {
  const router = useRouter();
  return (
    <header className={styles.topBar}>
      <div className={styles.topBarLeft}>
        {showBack ? (
          <button type="button" className={styles.topBarBtn} aria-label="뒤로 가기" onClick={() => router.history.back()}>
            <ChevronLeft size={22} />
          </button>
        ) : null}
        <span className={styles.topBarTitle}>{title}</span>
      </div>
      {right}
    </header>
  );
}

type TabKey = 'time' | 'projects' | 'guide';

const TAB_ITEMS: { key: TabKey; to: string; label: string; icon: typeof CalendarClock }[] = [
  { key: 'time', to: '/', label: '시간', icon: CalendarClock },
  { key: 'projects', to: '/projects', label: '프로젝트', icon: LayoutGrid },
  { key: 'guide', to: '/guide', label: '가이드', icon: Sparkles },
];

export function BottomTabBar() {
  const { pathname } = useLocation();
  const activeKey: TabKey = pathname.startsWith('/projects') ? 'projects' : pathname.startsWith('/guide') ? 'guide' : 'time';

  return (
    <nav className={styles.tabBar} aria-label="주요 메뉴">
      <div className={styles.tabBarInner}>
        {TAB_ITEMS.map(({ key, to, label, icon: Icon }) => {
          const active = key === activeKey;
          return (
            <Link
              key={key}
              to={to}
              className={`${styles.tabItem} ${active ? styles.tabItemActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Fab({ onClick, label = '태스크 추가' }: { onClick?: () => void; label?: string }) {
  const navigate = useNavigate();
  const handleClick = onClick ?? (() => navigate({ to: '/tasks/new' }));
  return (
    <button type="button" className={styles.fab} aria-label={label} onClick={handleClick}>
      <Plus size={26} strokeWidth={2.4} />
    </button>
  );
}

type ShellProps = {
  topBar: ReactNode;
  children: ReactNode;
  showTabBar?: boolean;
  showFab?: boolean;
};

export function MobileShell({ topBar, children, showTabBar = true, showFab = true }: ShellProps) {
  return (
    <div className={styles.viewport}>
      <div className={styles.frame}>
        {topBar}
        <main className={styles.content}>{children}</main>
        {showFab ? <Fab /> : null}
        {showTabBar ? <BottomTabBar /> : null}
      </div>
    </div>
  );
}
