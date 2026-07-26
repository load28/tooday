import { createFileRoute } from '@tanstack/react-router';
import { ProjectDetailScreen } from '@/features/projects/project-detail-screen';

export const Route = createFileRoute('/_app/_tabs/projects/$projectId')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(context.trpc.task.project.queryOptions({ projectId: params.projectId }));
  },
  component: ProjectDetailRoute,
});

function ProjectDetailRoute() {
  const { projectId } = Route.useParams();
  return <ProjectDetailScreen projectId={projectId} />;
}
