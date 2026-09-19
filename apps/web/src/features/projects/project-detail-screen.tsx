import { ToggleGroup } from '@ark-ui/react/toggle-group';
import * as stylex from '@stylexjs/stylex';
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useAtom } from '@tanstack/react-store';
import type { Task, TaskStatus } from '@tooday/shared';
import { ChevronLeft, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useTaskServerQueries } from '@/entities/task/context';
import { STATUS_ORDER } from '@/entities/task/status';
import { styles } from '@/features/projects/project-detail-screen.styles';
import { useProjectStatusFilterStore } from '@/features/projects/status-filter-store';
import { useT } from '@/shared/i18n';
import { AppBar, BaseButton, Button, Card, Dot, Row, Screen, Stack, Text } from '@/shared/ui';
import { text } from '@/styles/text.styles';

type ProjectDetailScreenProps = {
  projectId: string;
};

/** 뷰포트와 하단 탭바는 `routes/_app/_tabs` 레이아웃이 소유한다 — 여기선 헤더·본문만 그린다. */
export function ProjectDetailScreen({ projectId }: ProjectDetailScreenProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const taskQueries = useTaskServerQueries();
  const t = useT();

  const { data: tasks } = useLiveSuspenseQuery(taskQueries.taskView({ kind: 'project', projectId }));
  const { data: projects } = useLiveSuspenseQuery(taskQueries.projectView());
  const project = projects.find((item) => item.id === projectId);
  const { statusFilterAtom } = useProjectStatusFilterStore();
  const [tab, setTab] = useAtom(statusFilterAtom);

  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
    for (const task of tasks) groups[task.status].push(task);
    return groups;
  }, [tasks]);

  const items = byStatus[tab].sort((a, b) => a.date.localeCompare(b.date) || a.startAt.localeCompare(b.startAt));
  if (!project) return <Text>{t.notFound.message}</Text>;

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
          {...stylex.props(styles.segment)}
        >
          {STATUS_ORDER.map((status) => (
            <ToggleGroup.Item key={status} value={status} asChild>
              <BaseButton sx={[text.bodySm, styles.segmentButton]}>
                <span>{t.common.status[status]}</span>
                <Text variant="micro" tone={tab === status ? 'tertiary' : 'placeholder'}>
                  {byStatus[status].length}
                </Text>
              </BaseButton>
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>

        {items.length === 0 ? (
          <Stack align="center" sx={styles.empty}>
            <Text variant="bodySm" tone="placeholder">
              {t.projectDetail.empty}
            </Text>
          </Stack>
        ) : (
          <Stack gap="md" sx={styles.list}>
            {items.map((task) => {
              const isDone = task.status === 'done';
              return (
                <Card
                  key={task.id}
                  as="button"
                  interactive
                  padding="none"
                  sx={styles.row}
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
