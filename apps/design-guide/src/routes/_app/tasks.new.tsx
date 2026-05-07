import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { MobileShell, TopBar } from '@/components/shell';
import { NewTask } from '@/screens/new-task';

export const Route = createFileRoute('/_app/tasks/new')({
  component: NewTaskPage,
});

function NewTaskPage() {
  const navigate = useNavigate();
  const router = useRouter();
  return (
    <MobileShell
      topBar={<TopBar title="새 태스크" showBack onBack={() => router.history.back()} />}
      showFab={false}
      showTab={false}
    >
      <NewTask onCancel={() => router.history.back()} onCreate={() => navigate({ to: '/' })} />
    </MobileShell>
  );
}
