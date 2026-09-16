import { createFileRoute, notFound } from '@tanstack/react-router';
import { TaskPageStateProvider } from '@/features/tasks/state';
import { TaskDetailScreen } from '@/features/tasks/task-detail-screen';

export const Route = createFileRoute('/_app/tasks/$taskId')({
  // 태스크 단건과 프로젝트 선택지를 미리 채운다 — 첫 렌더에서 suspend 하지 않게
  loader: async ({ context, params }) => {
    const data = context.taskSession.get(context.user.id);
    await data.preload({ kind: 'task', id: params.taskId });
    if (!data.tasks.has(params.taskId)) throw notFound();
  },
  component: TaskDetailRoute,
});

function TaskDetailRoute() {
  const { taskId } = Route.useParams();
  return (
    <TaskPageStateProvider key={taskId}>
      <TaskDetailScreen taskId={taskId} />
    </TaskPageStateProvider>
  );
}
