import { Link } from '@tanstack/react-router';
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
    return <p className={styles.empty}>이 날에는 일정이 없어요</p>;
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
        return <DaySection key={key} label={SECTION_LABEL[key]} items={items} />;
      })}
    </div>
  );
}

function DaySection({ label, items }: { label: string; items: Task[] }) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>{label}</header>
      <ul className={styles.list}>
        {items.map((task) => {
          const project = getProject(task.projectId);
          const accent = project ? PROJECT_COLOR_HEX[project.color] : '#8b95a1';
          const isDone = task.status === 'done';

          return (
            <li key={task.id} className={styles.row}>
              <Link to="/tasks/$taskId" params={{ taskId: task.id }} className={styles.body}>
                <span className={styles.time}>{task.startAt}</span>
                <span className={styles.dot} style={{ background: isDone ? '#d1d6db' : accent }} />
                <span className={`${styles.title} ${isDone ? styles.titleDone : ''}`}>{task.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
