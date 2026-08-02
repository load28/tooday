import type { Project, Task } from '@tooday/shared';
import { Check, LoaderCircle } from 'lucide-react';
import { bodyCls, cardCls, checkRecipe } from '@/features/today/task-card.css';
import { useT } from '@/shared/i18n';
import { BaseButton, Card, Dot, HStack, Text } from '@/shared/ui';

type TaskCardProps = {
  task: Task;
  project: Project | undefined;
  onToggle?: (task: Task) => void;
  onClick?: () => void;
};

export function TaskCard({ task, project, onToggle, onClick }: TaskCardProps) {
  const t = useT();
  const isDone = task.status === 'done';

  return (
    <Card padding="md" selected={task.status === 'doing'} className={cardCls}>
      <BaseButton onClick={onClick} className={bodyCls}>
        <Text as="h3" variant="subtitle" tone={isDone ? 'tertiary' : 'default'} truncate strike={isDone}>
          {task.title}
        </Text>
        <HStack gap="sm">
          <Dot size="sm" tone={project?.color ?? 'gray'} />
          <Text variant="caption" tone="tertiary">
            {project?.name ?? '—'}
          </Text>
        </HStack>
      </BaseButton>
      <BaseButton
        aria-label={t.today.toggleDone}
        aria-pressed={isDone}
        onClick={() => onToggle?.(task)}
        className={checkRecipe({ status: task.status })}
      >
        {isDone ? (
          <Check size={14} strokeWidth={3} />
        ) : task.status === 'doing' ? (
          <LoaderCircle size={14} strokeWidth={2.4} />
        ) : null}
      </BaseButton>
    </Card>
  );
}
