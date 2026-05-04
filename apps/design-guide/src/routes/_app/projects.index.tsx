import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { IconPlus } from '@/components/icons';
import { MobileShell, shellStyles, type TabKey, TopBar } from '@/components/shell';
import { ProjectsList } from '@/screens/projects';

export const Route = createFileRoute('/_app/projects/')({
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const onTabChange = (k: TabKey) => {
    if (k === 'time') navigate({ to: '/' });
    else if (k === 'guide') navigate({ to: '/guide' });
  };

  return (
    <MobileShell
      topBar={
        <TopBar
          title="프로젝트"
          right={
            <button
              type="button"
              style={shellStyles.topBarBtn}
              aria-label="태스크 추가"
              onClick={() => navigate({ to: '/tasks/new' })}
            >
              <IconPlus size={22} strokeWidth={2.4} />
            </button>
          }
        />
      }
      tab="projects"
      onTabChange={onTabChange}
      showFab={false}
    >
      <ProjectsList onOpenProject={(id) => navigate({ to: '/projects/$projectId', params: { projectId: id } })} />
    </MobileShell>
  );
}
