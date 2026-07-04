import type { Project, Task } from '@tooday/shared';
import { Check, LoaderCircle } from 'lucide-react';
import { css, cva, cx } from 'styled-system/css';
import { PROJECT_COLOR } from '@/features/today/project-color';
import { useT } from '@/shared/i18n';
import { Card, Dot, HStack, Text } from '@/shared/ui';

// 패딩은 Card의 padding variant로 준다 — 여기서 padding을 덮으면 recipe 기본값(p_0)과 충돌한다
const cardCls = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'xl',
});

const bodyCls = css({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'sm',
  padding: 0,
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  fontFamily: 'inherit',
  cursor: 'pointer',
  color: 'inherit',
  _focusVisible: { outline: 'none', boxShadow: 'focus', borderRadius: 'xs' },
});

// 색은 Text의 tone prop으로 바꾼다 — 여기서 color를 덮으면 recipe의 tone 클래스와 충돌한다
const titleDoneCls = css({
  textDecoration: 'line-through',
  textDecorationColor: 'borderStrong',
});

const checkRecipe = cva({
  base: {
    width: '4xl',
    height: '4xl',
    borderRadius: 'sm',
    border: '1.5px solid {colors.borderStrong}',
    background: 'surface',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    cursor: 'pointer',
    padding: 0,
    transition: 'all {durations.base} {easings.standard}',
    _focusVisible: { outline: 'none', boxShadow: 'focus' },
  },
  variants: {
    status: {
      todo: {},
      doing: { background: 'primarySoft', borderColor: 'primary', color: 'primary' },
      done: { background: 'success', borderColor: 'success', color: 'textInverse' },
    },
  },
});

type TaskCardProps = {
  task: Task;
  project: Project | undefined;
  onToggle?: (task: Task) => void;
  onClick?: () => void;
};

export function TaskCard({ task, project, onToggle, onClick }: TaskCardProps) {
  const t = useT();
  const accent = project ? PROJECT_COLOR[project.color] : PROJECT_COLOR.gray;
  const isDone = task.status === 'done';

  return (
    <Card padding="md" selected={task.status === 'doing'} className={cardCls}>
      <button type="button" onClick={onClick} className={bodyCls}>
        <Text as="h3" variant="subtitle" tone={isDone ? 'tertiary' : 'default'} truncate className={cx(isDone && titleDoneCls)}>
          {task.title}
        </Text>
        <HStack gap="sm">
          <Dot size="sm" color={accent} />
          <Text variant="caption" tone="tertiary">
            {project?.name ?? '—'}
          </Text>
        </HStack>
      </button>
      <button
        type="button"
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
      </button>
    </Card>
  );
}
