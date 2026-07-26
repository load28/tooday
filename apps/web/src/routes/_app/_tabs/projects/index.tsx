import { createFileRoute } from '@tanstack/react-router';
import { ProjectsScreen } from '@/features/projects/projects-screen';

export const Route = createFileRoute('/_app/_tabs/projects/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.trpc.task.projects.queryOptions());
  },
  component: ProjectsRoute,
});

function ProjectsRoute() {
  return <ProjectsScreen />;
}
