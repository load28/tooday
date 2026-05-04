import { createFileRoute, notFound, useNavigate, useRouter } from '@tanstack/react-router';
import { IconMore } from '@/components/icons';
import { MobileShell, shellStyles, TopBar } from '@/components/shell';
import { getTask } from '@/lib/data';
import { TaskDetail } from '@/screens/task-detail';

export const Route = createFileRoute('/_app/tasks/$taskId')({
  component: TaskDetailPage,
});

function TaskDetailPage() {
  const { taskId } = Route.useParams();
  const task = getTask(taskId);
  if (!task) throw notFound();

  const navigate = useNavigate();
  const router = useRouter();

  return (
    <MobileShell
      topBar={
        <TopBar
          title="태스크"
          showBack
          onBack={() => router.history.back()}
          right={
            <button type="button" style={shellStyles.topBarBtn} aria-label="더보기">
              <IconMore size={22} />
            </button>
          }
        />
      }
      showFab={false}
      showTab={false}
    >
      <TaskDetail task={task} onDelete={() => navigate({ to: '/' })} />
    </MobileShell>
  );
}
