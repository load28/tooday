import { createFileRoute } from '@tanstack/react-router';
import { ProjectDetailScreen } from '@/features/projects/project-detail-screen';

export const Route = createFileRoute('/_app/projects/$projectId')({
  component: ProjectDetailScreen,
});
