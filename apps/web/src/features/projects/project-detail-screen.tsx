import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext, useRouter } from '@tanstack/react-router';
import type { Task, TaskStatus } from '@tooday/shared';
import { CalendarDays, ChevronLeft, LayoutGrid, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { css, cva } from 'styled-system/css';
import { STATUS_ORDER } from '@/features/tasks/status';
import { useT } from '@/shared/i18n';
import { AppBar, Card, Dot, Pressable, Row, Screen, Stack, TabBar, Text } from '@/shared/ui';

const segmentCls = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 'xs',
  bg: 'surfaceSoft',
  borderRadius: 'lg',
  padding: 'xs',
  marginInline: 'pageX',
  marginTop: 'md',
  marginBottom: 'lg',
});

const segmentButtonRecipe = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'sm',
    height: '36px',
    border: 'none',
    borderRadius: 'md',
    background: 'transparent',
    color: 'textTertiary',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textStyle: 'bodySm',
    transition: 'color {durations.base} {easings.standard}, background {durations.base} {easings.standard}',
    _focusVisible: { outline: 'none', boxShadow: 'focus' },
  },
  variants: {
    active: {
      true: { bg: 'surface', color: 'text', boxShadow: 'sm', fontWeight: '700' },
      false: {},
    },
  },
});

const listCls = css({
  paddingInline: 'pageX',
  paddingBottom: '4xl',
});

const emptyCls = css({ paddingY: '48px', paddingInline: '2xl' });

const rowCls = css({ width: '100%' });

const titleDoneCls = css({ textDecoration: 'line-through', textDecorationColor: 'borderStrong' });

type ProjectDetailScreenProps = {
  projectId: string;
};

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
    <Screen
      topBar={
        <AppBar>
          <AppBar.Leading>
            <Pressable size="icon" shape="square" aria-label={t.common.back} onClick={() => router.history.back()}>
              <ChevronLeft size={22} />
            </Pressable>
          </AppBar.Leading>
          <AppBar.Title>{project.name}</AppBar.Title>
          <AppBar.Trailing>
            <Pressable
              size="icon"
              shape="square"
              aria-label={t.projectDetail.addTask}
              onClick={() => navigate({ to: '/tasks/new' })}
            >
              <Plus size={22} strokeWidth={2.4} />
            </Pressable>
          </AppBar.Trailing>
        </AppBar>
      }
      bottomBar={
        <TabBar
          aria-label={t.nav.label}
          items={[
            { key: 'today', label: t.nav.today, icon: <CalendarDays size={22} /> },
            { key: 'projects', label: t.nav.projects, icon: <LayoutGrid size={22} /> },
          ]}
          activeKey="projects"
          onSelect={(key) => {
            if (key === 'today') void navigate({ to: '/today' });
            else void navigate({ to: '/projects' });
          }}
        />
      }
    >
      <div className={segmentCls}>
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={tab === status}
            className={segmentButtonRecipe({ active: tab === status })}
            onClick={() => setTab(status)}
          >
            <span>{t.common.status[status]}</span>
            <Text variant="micro" tone={tab === status ? 'tertiary' : 'placeholder'}>
              {byStatus[status].length}
            </Text>
          </button>
        ))}
      </div>

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
                  <Text
                    variant="bodyStrong"
                    tone={isDone ? 'tertiary' : 'default'}
                    truncate
                    className={isDone ? titleDoneCls : undefined}
                  >
                    {task.title}
                  </Text>
                </Row>
              </Card>
            );
          })}
        </Stack>
      )}
    </Screen>
  );
}
