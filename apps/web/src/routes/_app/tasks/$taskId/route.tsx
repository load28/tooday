import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tasks/$taskId')({
  component: TaskDetailPage,
});

function TaskDetailPage() {
  return <>Task Detail</>;
}
