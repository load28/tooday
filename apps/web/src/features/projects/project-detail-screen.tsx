import { ToggleGroup } from '@ark-ui/react/toggle-group';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext, useRouter } from '@tanstack/react-router';
import type { Task, TaskStatus } from '@tooday/shared';
import { ChevronLeft, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { STATUS_ORDER } from '@/entities/task/status';
import { emptyCls, listCls, rowCls, segmentButtonCls, segmentCls } from '@/features/projects/project-detail-screen.css';
import { useT } from '@/shared/i18n';
import { AppBar, BaseButton, Button, Card, Dot, Row, Screen, Stack, Text } from '@/shared/ui';

type ProjectDetailScreenProps = {
  projectId: string;
};

/** 뷰포트와 하단 탭바는 `routes/_app/_tabs` 레이아웃이 소유한다 — 여기선 헤더·본문만 그린다. */
export function ProjectDetailScreen({ projectId }: ProjectDetailScreenProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const { trpc } = useRouteContext({ from: '__root__' });
  const t = useT();

  const {
    data: { project, tasks },
  } = useSuspenseQuery(trpc.task.project.queryOptions({ projectId }));

  const [tab, setTab] = useState<TaskStatus>('todo');

  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
    for (const task of tasks) groups[task.status].push(task);
    return groups;
  }, [tasks]);

  const items = byStatus[tab];

  return (
    <>
      <Screen.Header>
        <AppBar>
          <AppBar.Leading>
            <Button size="icon" shape="square" aria-label={t.common.back} onClick={() => router.history.back()}>
              <ChevronLeft size={22} />
            </Button>
          </AppBar.Leading>
          <AppBar.Title>{project.name}</AppBar.Title>
          <AppBar.Trailing>
            <Button
              size="icon"
              shape="square"
              aria-label={t.projectDetail.addTask}
              onClick={() => navigate({ to: '/tasks/new' })}
            >
              <Plus size={22} strokeWidth={2.4} />
            </Button>
          </AppBar.Trailing>
        </AppBar>
      </Screen.Header>
      <Screen.Content>
        <ToggleGroup.Root
          value={[tab]}
          onValueChange={(details) => {
            // 단일 선택 — 선택된 세그먼트를 다시 눌러 빈 상태가 되는 것은 무시한다
            const next = STATUS_ORDER.find((status) => status === details.value[0]);
            if (next !== undefined) setTab(next);
          }}
          className={segmentCls}
        >
          {STATUS_ORDER.map((status) => (
            <ToggleGroup.Item key={status} value={status} asChild>
              <BaseButton className={segmentButtonCls}>
                <span>{t.common.status[status]}</span>
                <Text variant="micro" tone={tab === status ? 'tertiary' : 'placeholder'}>
                  {byStatus[status].length}
                </Text>
              </BaseButton>
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>

        {items.length === 0 ? (
          <Stack align="center" className={emptyCls}>
            <Text variant="bodySm" tone="placeholder">
              {t.projectDetail.empty}
            </Text>
          </Stack>
        ) : (
          <Stack gap="md" className={listCls}>
            {items.map((task) => {
              const isDone = task.status === 'done';
              return (
                <Card
                  key={task.id}
                  as="button"
                  interactive
                  padding="none"
                  className={rowCls}
                  onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })}
                >
                  <Row
                    leading={<Dot size="sm" tone={isDone ? 'muted' : project.color} />}
                    trailing={
                      <Text variant="numeric" tone="tertiary">
                        {task.startAt}
                      </Text>
                    }
                  >
                    <Text variant="bodyStrong" tone={isDone ? 'tertiary' : 'default'} truncate strike={isDone}>
                      {task.title}
                    </Text>
                  </Row>
                </Card>
              );
            })}
          </Stack>
        )}
      </Screen.Content>
    </>
  );
}
