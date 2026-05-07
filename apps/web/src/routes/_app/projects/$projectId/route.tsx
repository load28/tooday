import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/projects/$projectId')({
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  return <>Project Detail</>;
}
