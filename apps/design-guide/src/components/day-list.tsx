import { Link } from '@tanstack/react-router';
import { CalendarOff } from 'lucide-react';
import { card } from '@/components/atoms.css';
import { getProject, PROJECT_COLOR_HEX, type Task } from '@/data/mock';
import * as styles from './day-list.css';

type SectionKey = 'morning' | 'afternoon' | 'evening';

const SECTION_LABEL: Record<SectionKey, string> = {
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
};
const SECTION_ORDER: SectionKey[] = ['morning', 'afternoon', 'evening'];

function timeToMin(t: string) {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
}

function getSectionKey(time: string): SectionKey {
  const [h = 0] = time.split(':').map(Number);
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function DayList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className={styles.empty}>
        <CalendarOff size={40} strokeWidth={1.6} className={styles.emptyIcon} />
        <p className={styles.emptyText}>이 날에는 일정이 없어요</p>
        <p className={styles.emptyHint}>새 태스크를 추가해 하루를 계획해 보세요</p>
      </div>
    );
  }

  const sorted = [...tasks].sort((a, b) => timeToMin(a.startAt) - timeToMin(b.startAt));
  const grouped: Record<SectionKey, Task[]> = {
    morning: sorted.filter((t) => getSectionKey(t.startAt) === 'morning'),
    afternoon: sorted.filter((t) => getSectionKey(t.startAt) === 'afternoon'),
    evening: sorted.filter((t) => getSectionKey(t.startAt) === 'evening'),
  };

  return (
    <div className={styles.dayList}>
      {SECTION_ORDER.map((key) => {
        const items = grouped[key];
        if (items.length === 0) return null;
        return (
          <section key={key} className={styles.section}>
            <header className={styles.sectionHeader}>{SECTION_LABEL[key]}</header>
            <ul className={`${card} ${styles.list}`}>
              {items.map((task) => {
                const project = getProject(task.projectId);
                const accent = project ? PROJECT_COLOR_HEX[project.color] : '#8b95a1';
                const isDone = task.status === 'done';

                return (
                  <li key={task.id} className={styles.row}>
                    <span aria-hidden="true" className={styles.accentLine} style={{ background: isDone ? '#d1d6db' : accent }} />
                    <Link to="/tasks/$taskId" params={{ taskId: task.id }} className={styles.body}>
                      <span className={styles.time}>{task.startAt}</span>
                      <span className={`${styles.title} ${isDone ? styles.titleDone : ''}`}>{task.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
