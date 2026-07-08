import { createFileRoute } from '@tanstack/react-router';
import { NewProjectSheet } from '@/features/projects/new-project-sheet';
import { NewTaskScreen } from '@/features/tasks/new-task-screen';

export const Route = createFileRoute('/_app/tasks/new')({
  // 프로젝트 선택지를 미리 채워 첫 렌더에서 suspend 하지 않는다. now는 기본 날짜(오늘)를 고정한다.
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.trpc.task.projects.queryOptions());
    return { now: Date.now() };
  },
  component: NewTaskRoute,
});

function NewTaskRoute() {
  const { now } = Route.useLoaderData();
  // tasks ↔ projects feature 조립은 라우트(배선 층)가 담당한다 — feature 간 직접 import 금지
  return <NewTaskScreen now={now} renderNewProjectSheet={(props) => <NewProjectSheet {...props} />} />;
}
