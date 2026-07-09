import { createFileRoute } from '@tanstack/react-router';
import { ProjectsScreen } from '@/features/projects/projects-screen';
import { AppTabBar } from '@/routes/-app-tab-bar';

export const Route = createFileRoute('/_app/projects/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.trpc.task.projects.queryOptions());
  },
  component: ProjectsRoute,
});

function ProjectsRoute() {
  return <ProjectsScreen tabBar={<AppTabBar active="projects" />} />;
}
