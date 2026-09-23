import { createFileRoute } from '@tanstack/react-router';
import { ProjectsScreen } from '@/features/projects/projects-screen';
import { ProjectsScreenStoreProvider } from '@/features/projects/projects-screen-store';

export const Route = createFileRoute('/_app/_tabs/projects/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.taskCacheSession.get(context.user.id).preload({ kind: 'projects' }),
      context.taskCacheSession.get(context.user.id).preloadSummaries(),
    ]);
  },
  component: ProjectsRoute,
});

function ProjectsRoute() {
  return (
    <ProjectsScreenStoreProvider>
      <ProjectsScreen />
    </ProjectsScreenStoreProvider>
  );
}
