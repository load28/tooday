import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import type { Task, TaskRangeResponse, UpdateTaskRequest } from '@tooday/shared';
import { Bell, CalendarX2, Plus } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { css } from 'styled-system/css';
import { token } from 'styled-system/tokens';
import { applyTaskPatch } from '@/entities/task/patch';
import { TaskCard } from '@/features/today/task-card';
import { useTaskSync } from '@/features/today/use-task-sync';
import { buildWeek, weekRange } from '@/features/today/week';
import { WeekStrip } from '@/features/today/week-strip';
import { format, useLocale, useT } from '@/shared/i18n';
import { optimisticPatch } from '@/shared/query';
import { formatDuration, timeToMin } from '@/shared/time';
import { AppBar, Button, Card, Screen, Section, Stack, Text } from '@/shared/ui';

const pageCls = css({ paddingBottom: '4xl' });

// 패딩은 Card의 padding variant로 준다 — 여기서 padding을 덮으면 recipe 기본값(p_0)과 충돌한다
const heroCls = css({
  marginTop: 'xs',
  marginInline: 'pageX',
  marginBottom: '2xl',
  display: 'flex',
  flexDirection: 'column',
  gap: 'xl',
});

const timelineCls = css({
  paddingX: '2xl',
  display: 'flex',
  flexDirection: 'column',
  gap: 'lg',
});

const rowCls = css({
  display: 'grid',
  gridTemplateColumns: '{sizes.timeCol} 1fr',
  gap: 'xl',
  alignItems: 'stretch',
});

const timeColCls = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '2xs',
  // 카드 패딩(cardPadMd)에서 numeric(18px)·subtitle(22px) lineHeight 차의 절반을 당겨 첫 줄을 광학 정렬한다
  paddingTop: 'calc({spacing.cardPadMd} - 2px)',
});

const emptyCls = css({ paddingY: 'emptyStateY', paddingX: '4xl' });

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
  /** 하단 탭 내비 — feature 간 내비 조립이므로 라우트(배선 층)가 AppTabBar를 주입한다 */
  tabBar: ReactNode;
};

export function TodayScreen({ now, tabBar }: TodayScreenProps) {
  const navigate = useNavigate();
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });
  const t = useT();
  const locale = useLocale();

  const days = useMemo(() => buildWeek(new Date(now), locale), [now, locale]);
  const [activeOffset, setActiveOffset] = useState(0);

  // loader가 같은 범위를 ensureQueryData로 채워 두므로 첫 렌더에서 suspend 하지 않는다
  const range = useMemo(() => weekRange(new Date(now)), [now]);
  const { data } = useSuspenseQuery(trpc.task.range.queryOptions(range));

  // 다른 기기의 변경이 SSE 신호 → 델타 → 캐시 패치로 이 화면에 실시간 반영된다
  useTaskSync(range);

  const projectById = useMemo(() => new Map(data.projects.map((project) => [project.id, project])), [data.projects]);
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of data.tasks) {
      const list = map.get(task.date);
      if (list) list.push(task);
      else map.set(task.date, [task]);
    }
    // 델타 패치가 행을 뒤에 붙이므로 표시 순서는 여기서 보장한다
    for (const list of map.values()) {
      list.sort((a, b) => timeToMin(a.startAt) - timeToMin(b.startAt));
    }
    return map;
  }, [data.tasks]);

  const updateTask = useMutation(
    trpc.task.update.mutationOptions(
      optimisticPatch(
        queryClient,
        trpc.task.range.queryKey(range),
        (old: TaskRangeResponse, { id, patch }: UpdateTaskRequest) => ({
          ...old,
          tasks: old.tasks.map((task) => (task.id === id ? applyTaskPatch(task, patch) : task)),
        }),
      ),
    ),
  );

  const day = days.find((d) => d.offset === activeOffset) ?? days[0];
  if (!day) return null;

  const tasks = tasksByDate.get(day.key) ?? [];
  const remaining = tasks.filter((task) => task.status !== 'done').length;

  const toggleTask = (task: Task) => {
    updateTask.mutate({ id: task.id, patch: { status: task.status === 'done' ? 'todo' : 'done' } });
  };

  return (
    <Screen
      topBar={
        <AppBar>
          <AppBar.Title>{t.today.title}</AppBar.Title>
          <AppBar.Trailing>
            <Button size="icon" shape="square" aria-label={t.today.notifications}>
              <Bell size={20} />
            </Button>
            <Button size="icon" shape="square" aria-label={t.today.addTask} onClick={() => navigate({ to: '/tasks/new' })}>
              <Plus size={22} strokeWidth={2.4} />
            </Button>
          </AppBar.Trailing>
        </AppBar>
      }
      bottomBar={tabBar}
    >
      <div className={pageCls}>
        <Card radius="2xl" padding="lg" className={heroCls}>
          <Stack gap="xs">
            <Text variant="label" tone="brand">
              {day.isToday ? format(t.today.hero.today, { date: day.label }) : day.label}
            </Text>
            <Text as="h1" variant="display">
              {t.today.hero.remainingPrefix}{' '}
              <Text as="span" variant="display" tone="brand">
                {format(t.today.hero.remainingCount, { count: remaining })}
              </Text>{' '}
              <Text as="span" variant="display" tone="tertiary">
                {t.today.hero.remainingSuffix}
              </Text>
            </Text>
          </Stack>
        </Card>

        <WeekStrip
          days={days}
          activeOffset={activeOffset}
          hasTasks={(cell) => (tasksByDate.get(cell.key) ?? []).length > 0}
          onSelect={setActiveOffset}
        />

        {tasks.length === 0 ? (
          <Stack gap="sm" align="center" className={emptyCls}>
            <CalendarX2 size={36} color={token('colors.borderStrong')} />
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
                <div className={timelineCls}>
                  {items.map((task) => (
                    <div key={task.id} className={rowCls}>
                      <div className={timeColCls}>
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
    </Screen>
  );
}
