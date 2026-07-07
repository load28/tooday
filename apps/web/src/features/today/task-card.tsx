import type { Project, Task } from '@tooday/shared';
import { Check, LoaderCircle } from 'lucide-react';
import { css, cva, cx } from 'styled-system/css';
import { useT } from '@/shared/i18n';
import { BaseButton, Card, Dot, HStack, Text } from '@/shared/ui';

// 패딩은 Card의 padding variant로 준다 — 여기서 padding을 덮으면 recipe 기본값(p_0)과 충돌한다
const cardCls = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'xl',
});

// 리셋·포커스 링은 BaseButton이 제공 — 여기는 본문 레이아웃만 얹는다.
const bodyCls = css({
  flex: 1,
  minWidth: 0,
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 'sm',
  _focusVisible: { borderRadius: 'xs' },
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
    flex: '0 0 auto',
    transition: 'all {durations.base} {easings.standard}',
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
  const isDone = task.status === 'done';

  return (
    <Card padding="md" selected={task.status === 'doing'} className={cardCls}>
      <BaseButton onClick={onClick} className={bodyCls}>
        <Text as="h3" variant="subtitle" tone={isDone ? 'tertiary' : 'default'} truncate className={cx(isDone && titleDoneCls)}>
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
