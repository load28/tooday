import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { MobileShell, type TabKey, TopBar } from '@/components/shell';
import { GuidePage } from '@/screens/guide';

export const Route = createFileRoute('/_app/guide')({
  component: GuideRoute,
});

function GuideRoute() {
  const navigate = useNavigate();
  const onTabChange = (k: TabKey) => {
    if (k === 'time') navigate({ to: '/' });
    else if (k === 'projects') navigate({ to: '/projects' });
  };
  return (
    <MobileShell topBar={<TopBar title="디자인 가이드" />} tab="guide" onTabChange={onTabChange} showFab={false}>
      <GuidePage />
    </MobileShell>
  );
}
