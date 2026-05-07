import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tasks/new')({
  component: NewTaskPage,
});

function NewTaskPage() {
  return <>New Task</>;
}
