import * as stylex from '@stylexjs/stylex';
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { useNavigate } from '@tanstack/react-router';
import { useAtom } from '@tanstack/react-store';
import type { Task } from '@tooday/shared';
import { Bell, CalendarX2, Plus, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { useTaskData } from '@/entities/task/context';
import { useTodayState } from '@/features/today/state';
import { TaskCard } from '@/features/today/task-card';
import { styles } from '@/features/today/today-screen.styles';
import { buildWeek, weekRange } from '@/features/today/week';
import { WeekStrip } from '@/features/today/week-strip';
import { useActionState } from '@/shared/action-state';
import { useLocale, useT } from '@/shared/i18n';
import { formatDuration, timeToMin } from '@/shared/time';
import { AppBar, Button, Card, Screen, Section, Stack, Text } from '@/shared/ui';

type DaySection = 'morning' | 'afternoon' | 'evening';
const SECTION_ORDER: DaySection[] = ['morning', 'afternoon', 'evening'];

function sectionOf(startAt: string): DaySection {
  const hour = Math.floor(timeToMin(startAt) / 60);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

type TodayScreenProps = {
  /** 기준 시각(epoch ms). SSR과 하이드레이션이 같은 값을 쓰도록 라우트 loader에서 내려온다. */
  now: number;
};

/** 뷰포트와 하단 탭바는 `routes/_app/_tabs` 레이아웃이 소유한다 — 여기선 헤더·본문만 그린다. */
export function TodayScreen({ now }: TodayScreenProps) {
  const navigate = useNavigate();
  const taskData = useTaskData();
  const t = useT();
  const locale = useLocale();

  const days = useMemo(() => buildWeek(new Date(now), locale), [now, locale]);
  const { activeOffsetAtom } = useTodayState();
  const [activeOffset, setActiveOffset] = useAtom(activeOffsetAtom);

  const range = useMemo(() => weekRange(new Date(now)), [now]);
  const { data: taskRows } = useLiveSuspenseQuery(taskData.taskView({ kind: 'range', ...range }));
  const { data: projects } = useLiveSuspenseQuery(taskData.projectView());

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of taskRows) {
      const list = map.get(task.date);
      if (list) list.push(task);
      else map.set(task.date, [task]);
    }
    // 델타 패치가 행을 뒤에 붙이므로 표시 순서는 여기서 보장한다
    for (const list of map.values()) {
      list.sort((a, b) => timeToMin(a.startAt) - timeToMin(b.startAt));
    }
    return map;
  }, [taskRows]);

  const updateTask = useActionState();

  const day = days.find((d) => d.offset === activeOffset) ?? days[0];
  if (!day) return null;

  const tasks = tasksByDate.get(day.key) ?? [];
  const remaining = tasks.filter((task) => task.status !== 'done').length;

  const toggleTask = (task: Task) => {
    updateTask.dispatch(() =>
      taskData.actions.setTaskStatus({ taskId: task.id, status: task.status === 'done' ? 'todo' : 'done' }),
    );
  };

  return (
    <>
      <Screen.Header>
        <AppBar>
          <AppBar.Title>{t.today.title}</AppBar.Title>
          <AppBar.Trailing>
            <Button size="icon" shape="square" aria-label={t.settings.open} onClick={() => navigate({ to: '/settings' })}>
              <UserRound size={20} />
            </Button>
            <Button size="icon" shape="square" aria-label={t.today.notifications}>
              <Bell size={20} />
            </Button>
            <Button size="icon" shape="square" aria-label={t.today.addTask} onClick={() => navigate({ to: '/tasks/new' })}>
              <Plus size={22} strokeWidth={2.4} />
            </Button>
          </AppBar.Trailing>
        </AppBar>
      </Screen.Header>
      <Screen.Content>
        <div {...stylex.props(styles.page)}>
          <Card radius="2xl" padding="lg" sx={styles.hero}>
            <Stack gap="xs">
              <Text variant="label" tone="brand">
                {day.isToday ? t.today.hero.today({ date: day.label }) : day.label}
              </Text>
              <Text as="h1" variant="display">
                {t.today.hero.remainingPrefix}{' '}
                <Text as="span" variant="display" tone="brand">
                  {t.today.hero.remainingCount({ count: remaining })}
                </Text>{' '}
                <Text as="span" variant="display" tone="tertiary">
                  {t.today.hero.remainingSuffix}
                </Text>
              </Text>
            </Stack>
          </Card>

          {updateTask.isError ? (
            <Text role="alert" tone="danger">
              {t.common.error.unexpected}
            </Text>
          ) : null}
          <WeekStrip
            days={days}
            activeOffset={activeOffset}
            hasTasks={(cell) => (tasksByDate.get(cell.key) ?? []).length > 0}
            onSelect={setActiveOffset}
          />

          {tasks.length === 0 ? (
            <Stack gap="sm" align="center" sx={styles.empty}>
              <CalendarX2 size={36} {...stylex.props(styles.emptyIcon)} />
              <Text variant="bodyLgStrong" tone="secondary">
                {t.today.empty.title}
              </Text>
              <Text variant="bodySm" tone="tertiary">
                {t.today.empty.description}
              </Text>
            </Stack>
          ) : (
            SECTION_ORDER.map((sectionKey) => {
              const items = tasks.filter((task) => sectionOf(task.startAt) === sectionKey);
              if (items.length === 0) return null;
              return (
                <Section key={sectionKey} title={t.today.section[sectionKey]}>
                  <div {...stylex.props(styles.timeline)}>
                    {items.map((task) => (
                      <div key={task.id} {...stylex.props(styles.row)}>
                        <div {...stylex.props(styles.timeCol)}>
                          <Text variant="numeric" tone="secondary">
                            {task.startAt}
                          </Text>
                          <Text variant="micro" tone="placeholder">
                            {formatDuration(t, task.durationMin)}
                          </Text>
                        </div>
                        <TaskCard
                          task={task}
                          project={task.projectId !== null ? projectById.get(task.projectId) : undefined}
                          onToggle={toggleTask}
                          onClick={() => navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })}
                        />
                      </div>
                    ))}
                  </div>
                </Section>
              );
            })
          )}
        </div>
      </Screen.Content>
    </>
  );
}
