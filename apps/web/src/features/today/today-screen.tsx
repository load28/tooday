import { useNavigate } from '@tanstack/react-router';
import { Bell, CalendarDays, CalendarX2, LayoutGrid, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { css } from 'styled-system/css';
import { token } from 'styled-system/tokens';
import { MOCK_TASKS_BY_OFFSET, type Task, timeToMin } from '@/features/today/mock';
import { TaskCard } from '@/features/today/task-card';
import { buildWeek } from '@/features/today/week';
import { WeekStrip } from '@/features/today/week-strip';
import { format, type Messages, useLocale, useT } from '@/shared/i18n';
import { AppBar, Card, Pressable, Screen, Section, Stack, TabBar, Text } from '@/shared/ui';

const pageCls = css({ paddingBottom: '4xl' });

const heroCls = css({
  margin: '4px 16px 16px',
  padding: '20px 22px 22px',
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
  gridTemplateColumns: '52px 1fr',
  gap: 'xl',
  alignItems: 'stretch',
});

const timeColCls = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '2xs',
  paddingTop: '14px',
});

const emptyCls = css({ paddingY: '60px', paddingX: '4xl' });

type DaySection = 'morning' | 'afternoon' | 'evening';
const SECTION_ORDER: DaySection[] = ['morning', 'afternoon', 'evening'];

function sectionOf(startAt: string): DaySection {
  const hour = Math.floor(timeToMin(startAt) / 60);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function formatDuration(t: Messages, durationMin: number): string {
  if (durationMin < 60) return format(t.common.duration.minutes, { min: durationMin });
  const hour = Math.floor(durationMin / 60);
  const min = durationMin % 60;
  return min === 0 ? format(t.common.duration.hours, { hour }) : format(t.common.duration.hoursMinutes, { hour, min });
}

type TodayScreenProps = {
  /** 기준 시각(epoch ms). SSR과 하이드레이션이 같은 값을 쓰도록 라우트 loader에서 내려온다. */
  now: number;
};

export function TodayScreen({ now }: TodayScreenProps) {
  const navigate = useNavigate();
  const t = useT();
  const locale = useLocale();

  const days = useMemo(() => buildWeek(new Date(now), locale), [now, locale]);
  const [activeOffset, setActiveOffset] = useState(0);
  const [tasksByOffset, setTasksByOffset] = useState<Record<number, Task[]>>(MOCK_TASKS_BY_OFFSET);

  const day = days.find((d) => d.offset === activeOffset) ?? days[0];
  if (!day) return null;

  const tasks = [...(tasksByOffset[day.offset] ?? [])].sort((a, b) => timeToMin(a.startAt) - timeToMin(b.startAt));
  const remaining = tasks.filter((task) => task.status !== 'done').length;

  const toggleTask = (id: string) => {
    setTasksByOffset((prev) => ({
      ...prev,
      [day.offset]: (prev[day.offset] ?? []).map((task) =>
        task.id === id ? { ...task, status: task.status === 'done' ? 'todo' : 'done' } : task,
      ),
    }));
  };

  return (
    <Screen
      topBar={
        <AppBar>
          <AppBar.Title>{t.today.title}</AppBar.Title>
          <AppBar.Trailing>
            <Pressable size="icon" shape="square" aria-label={t.today.notifications}>
              <Bell size={20} />
            </Pressable>
            <Pressable size="icon" shape="square" aria-label={t.today.addTask} onClick={() => navigate({ to: '/tasks/new' })}>
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
          activeKey="today"
          onSelect={(key) => {
            if (key === 'projects') void navigate({ to: '/projects' });
          }}
        />
      }
    >
      <div className={pageCls}>
        <Card radius="2xl" className={heroCls}>
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
          hasTasks={(offset) => (tasksByOffset[offset] ?? []).length > 0}
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
