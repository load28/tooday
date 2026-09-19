import { createFileRoute, notFound } from '@tanstack/react-router';
import { ProjectDetailScreen } from '@/features/projects/project-detail-screen';
import { ProjectStatusFilterStoreProvider } from '@/features/projects/status-filter-store';

export const Route = createFileRoute('/_app/_tabs/projects/$projectId')({
  loader: async ({ context, params }) => {
    const data = context.taskCacheSession.get(context.user.id);
    await data.preload({ kind: 'project', projectId: params.projectId });
    if (!data.projects.has(params.projectId)) throw notFound();
  },
  component: ProjectDetailRoute,
});

function ProjectDetailRoute() {
  const { projectId } = Route.useParams();
  return (
    <ProjectStatusFilterStoreProvider key={projectId}>
      <ProjectDetailScreen projectId={projectId} />
    </ProjectStatusFilterStoreProvider>
  );
}
