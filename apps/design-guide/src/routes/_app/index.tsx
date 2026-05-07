import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { IconBell, IconPlus } from '@/components/icons';
import { MobileShell, shellStyles, type TabKey, TopBar } from '@/components/shell';
import { DAYS, TASKS, type Task, TODAY_INDEX } from '@/lib/data';
import { DayView } from '@/screens/day-view';

export const Route = createFileRoute('/_app/')({
  component: TimePage,
});

function TimePage() {
  const navigate = useNavigate();
  const [dayIdx, setDayIdx] = useState(TODAY_INDEX);
  const [tasks, setTasks] = useState<Task[]>(TASKS);

  const day = DAYS[dayIdx] ?? DAYS[TODAY_INDEX];
  if (!day) return null;
  const visibleTasks = day.isToday ? tasks : day.hasTasks ? tasks.slice(0, 3) : [];

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return { ...t, status: t.status === 'done' ? 'todo' : 'done' };
      }),
    );
  };

  const onTabChange = (k: TabKey) => {
    if (k === 'projects') navigate({ to: '/projects' });
    else if (k === 'guide') navigate({ to: '/guide' });
  };

  return (
    <MobileShell
      topBar={
        <TopBar
          title="오늘"
          right={
            <>
              <button type="button" style={shellStyles.topBarBtn} aria-label="알림">
                <IconBell size={20} />
              </button>
              <button
                type="button"
                style={shellStyles.topBarBtn}
                aria-label="태스크 추가"
                onClick={() => navigate({ to: '/tasks/new' })}
              >
                <IconPlus size={22} strokeWidth={2.4} />
              </button>
            </>
          }
        />
      }
      tab="time"
      onTabChange={onTabChange}
      showFab={false}
    >
      <DayView
        tasks={visibleTasks}
        day={day}
        days={DAYS}
        activeDayIdx={dayIdx}
        onSelectDay={setDayIdx}
        onTaskClick={(id) => navigate({ to: '/tasks/$taskId', params: { taskId: id } })}
        onToggleTask={toggleTask}
      />
    </MobileShell>
  );
}
