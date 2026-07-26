import { useLocation, useNavigate } from '@tanstack/react-router';
import { CalendarDays, LayoutGrid } from 'lucide-react';
import { useT } from '@/shared/i18n';
import { TabBar } from '@/shared/ui';

const TAB_PATH = {
  today: '/today',
  projects: '/projects',
} as const;

type AppTab = keyof typeof TAB_PATH;

const TABS = Object.keys(TAB_PATH) as AppTab[];

/**
 * today/projects 하단 내비 프리셋 — feature 간 내비게이션 조립이므로 배선 층(routes)이
 * 소유하고, `_tabs` 레이아웃이 푸터에 한 번만 렌더한다 (`-` 접두사라 라우트로
 * 생성되지 않는다).
 *
 * 활성 탭은 pathname에서 파생한다 — 레이아웃 한 곳에서만 렌더되므로 각 라우트가
 * 같은 사실을 prop으로 넘길 이유가 없다. `/projects/$projectId`는 projects가 활성이다.
 *
 * 탭을 누르면 해당 탭의 루트로 이동한다 — 이미 그 화면이면 아무것도 하지 않는다
 * (예: 프로젝트 상세에서 projects 탭을 누르면 목록으로 올라간다).
 */
export function AppTabBar() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const t = useT();

  const active = TABS.find((tab) => pathname.startsWith(TAB_PATH[tab])) ?? 'today';

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
