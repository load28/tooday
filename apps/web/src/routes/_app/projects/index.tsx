import { createFileRoute } from '@tanstack/react-router';
import { ProjectsScreen } from '@/features/projects/projects-screen';

export const Route = createFileRoute('/_app/projects/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.trpc.task.projects.queryOptions());
  },
  component: ProjectsScreen,
});
