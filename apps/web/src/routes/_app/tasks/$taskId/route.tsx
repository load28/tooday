import { createFileRoute } from '@tanstack/react-router';
import { TaskDetailScreen } from '@/features/tasks/task-detail-screen';

export const Route = createFileRoute('/_app/tasks/$taskId')({
  // 태스크 단건과 프로젝트 선택지를 미리 채운다 — 첫 렌더에서 suspend 하지 않게
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.trpc.task.byId.queryOptions({ id: params.taskId })),
      context.queryClient.ensureQueryData(context.trpc.task.projects.queryOptions()),
    ]);
  },
  component: TaskDetailRoute,
});

function TaskDetailRoute() {
  const { taskId } = Route.useParams();
  return <TaskDetailScreen taskId={taskId} />;
}
