import { createFileRoute } from '@tanstack/react-router';
import { TaskDetailScreen } from '@/features/tasks/task-detail-screen';

export const Route = createFileRoute('/_app/tasks/$taskId')({
  component: TaskDetailScreen,
});
