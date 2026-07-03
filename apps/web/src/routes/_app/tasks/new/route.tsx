import { createFileRoute } from '@tanstack/react-router';
import { NewTaskScreen } from '@/features/tasks/new-task-screen';

export const Route = createFileRoute('/_app/tasks/new')({
  component: NewTaskScreen,
});
