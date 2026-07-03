import { createFileRoute } from '@tanstack/react-router';
import { ProjectsScreen } from '@/features/projects/projects-screen';

export const Route = createFileRoute('/_app/projects/')({
  component: ProjectsScreen,
});
