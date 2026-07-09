import { useLocation, useNavigate } from '@tanstack/react-router';
import { CalendarDays, LayoutGrid } from 'lucide-react';
import { useT } from '@/shared/i18n';
import { TabBar } from '@/shared/ui';

const TAB_PATH = {
  today: '/today',
  projects: '/projects',
} as const;

type AppTab = keyof typeof TAB_PATH;

type AppTabBarProps = {
  active: AppTab;
};

/**
 * today/projects 하단 내비 프리셋 — feature 간 내비게이션 조립이므로 배선 층(routes)이
 * 소유하고, 각 화면에는 tabBar 슬롯으로 주입한다 (`-` 접두사라 라우트로 생성되지 않는다).
 * 탭을 누르면 해당 탭의 루트로 이동한다 — 이미 그 화면이면 아무것도 하지 않는다
 * (예: 프로젝트 상세에서 projects 탭을 누르면 목록으로 올라간다).
 */
export function AppTabBar({ active }: AppTabBarProps) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const t = useT();

  return (
    <TabBar
      aria-label={t.nav.label}
      items={[
        { key: 'today', label: t.nav.today, icon: <CalendarDays size={22} /> },
        { key: 'projects', label: t.nav.projects, icon: <LayoutGrid size={22} /> },
      ]}
      activeKey={active}
      onSelect={(tab) => {
        if (pathname !== TAB_PATH[tab]) void navigate({ to: TAB_PATH[tab] });
      }}
    />
  );
}
