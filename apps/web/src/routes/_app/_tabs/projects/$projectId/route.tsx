import { createFileRoute, notFound } from '@tanstack/react-router';
import { ProjectDetailScreen } from '@/features/projects/project-detail-screen';
import { ProjectPageStateProvider } from '@/features/projects/state';

export const Route = createFileRoute('/_app/_tabs/projects/$projectId')({
  loader: async ({ context, params }) => {
    const data = context.taskSession.get(context.user.id);
    await data.preload({ kind: 'project', projectId: params.projectId });
    if (!data.projects.has(params.projectId)) throw notFound();
  },
  component: ProjectDetailRoute,
});

function ProjectDetailRoute() {
  const { projectId } = Route.useParams();
  return (
    <ProjectPageStateProvider key={projectId}>
      <ProjectDetailScreen projectId={projectId} />
    </ProjectPageStateProvider>
  );
}
