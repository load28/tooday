import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { TaskServerCacheProvider } from '@/entities/task/context';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const user = await context.auth.resolveUser();
    if (!user) {
      await context.endSession();
      throw redirect({ to: '/login' });
    }
    if (context.taskCacheSession.userId && context.taskCacheSession.userId !== user.id) await context.endSession();
    context.taskCacheSession.get(user.id);
    return { user };
  },
  component: AuthenticatedApp,
});

function AuthenticatedApp() {
  const { user, taskCacheSession } = Route.useRouteContext();
  return (
    <TaskServerCacheProvider cache={taskCacheSession.get(user.id)}>
      <Outlet />
    </TaskServerCacheProvider>
  );
}
