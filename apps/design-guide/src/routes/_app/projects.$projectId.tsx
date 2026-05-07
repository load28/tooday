import { createFileRoute, notFound, useNavigate, useRouter } from '@tanstack/react-router';
import { IconMore, IconPlus } from '@/components/icons';
import { MobileShell, shellStyles, type TabKey, TopBar } from '@/components/shell';
import { getProject } from '@/lib/data';
import { ProjectDetail } from '@/screens/projects';

export const Route = createFileRoute('/_app/projects/$projectId')({
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const project = getProject(projectId);
  if (!project) throw notFound();

  const navigate = useNavigate();
  const router = useRouter();

  const onTabChange = (k: TabKey) => {
    if (k === 'time') navigate({ to: '/' });
    else if (k === 'projects') navigate({ to: '/projects' });
    else if (k === 'guide') navigate({ to: '/guide' });
  };

  return (
    <MobileShell
      topBar={
        <TopBar
          title={project.name}
          showBack
          onBack={() => router.history.back()}
          right={
            <>
              <button
                type="button"
                style={shellStyles.topBarBtn}
                aria-label="태스크 추가"
                onClick={() => navigate({ to: '/tasks/new' })}
              >
                <IconPlus size={22} strokeWidth={2.4} />
              </button>
              <button type="button" style={shellStyles.topBarBtn} aria-label="더보기">
                <IconMore size={22} />
              </button>
            </>
          }
        />
      }
      tab="projects"
      onTabChange={onTabChange}
      showFab={false}
    >
      <ProjectDetail project={project} onTaskClick={(id) => navigate({ to: '/tasks/$taskId', params: { taskId: id } })} />
    </MobileShell>
  );
}
