import { createFileRoute } from '@tanstack/react-router';
import { ProjectDetailScreen } from '@/features/projects/project-detail-screen';
import { AppTabBar } from '@/routes/-app-tab-bar';

export const Route = createFileRoute('/_app/projects/$projectId')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(context.trpc.task.project.queryOptions({ projectId: params.projectId }));
  },
  component: ProjectDetailRoute,
});

function ProjectDetailRoute() {
  const { projectId } = Route.useParams();
  return <ProjectDetailScreen projectId={projectId} tabBar={<AppTabBar active="projects" />} />;
}
