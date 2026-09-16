import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { fetchSessionUser } from '@/app/trpc.ts';
import { TaskDataProvider } from '@/entities/task/context';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const user = await fetchSessionUser(context);
    if (!user) {
      await context.endSession();
      throw redirect({ to: '/login' });
    }
    if (context.taskSession.userId && context.taskSession.userId !== user.id) await context.endSession();
    context.taskSession.get(user.id);
    return { user };
  },
  component: AuthenticatedApp,
});

function AuthenticatedApp() {
  const { user, taskSession } = Route.useRouteContext();
  return (
    <TaskDataProvider data={taskSession.get(user.id)}>
      <Outlet />
    </TaskDataProvider>
  );
}
