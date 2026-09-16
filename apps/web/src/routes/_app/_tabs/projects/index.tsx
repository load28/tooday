import { createFileRoute } from '@tanstack/react-router';
import { ProjectsScreen } from '@/features/projects/projects-screen';

export const Route = createFileRoute('/_app/_tabs/projects/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.taskSession.get(context.user.id).preload({ kind: 'projects' }),
      context.queryClient.ensureQueryData({ ...context.trpc.task.projects.queryOptions(), revalidateIfStale: true }),
    ]);
  },
  component: ProjectsRoute,
});

function ProjectsRoute() {
  return <ProjectsScreen />;
}
