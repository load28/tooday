import { Link } from '@tanstack/react-router';
import { GripVertical } from 'lucide-react';
import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { getProject, PROJECT_COLOR_HEX, type Task } from '@/data/mock';
import * as styles from './day-list.css';

const ROW_HEIGHT = 52;

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
        return <DaySection key={key} label={SECTION_LABEL[key]} initial={items} />;
      })}
    </div>
  );
}

function DaySection({ label, initial }: { label: string; initial: Task[] }) {
  const [items, setItems] = useState(initial);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dy, setDy] = useState(0);
  const dragRef = useRef<{ pointerId: number; startY: number } | null>(null);

  const targetIdx = dragIdx === null ? -1 : Math.max(0, Math.min(items.length - 1, dragIdx + Math.round(dy / ROW_HEIGHT)));

  const handleDown = (e: ReactPointerEvent<HTMLButtonElement>, idx: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startY: e.clientY };
    setDragIdx(idx);
    setDy(0);
  };

  const handleMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    setDy(e.clientY - dragRef.current.startY);
  };

  const handleUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (dragIdx !== null && targetIdx !== dragIdx) {
      setItems((prev) => {
        const next = [...prev];
        const moved = next.splice(dragIdx, 1)[0];
        if (moved) next.splice(targetIdx, 0, moved);
        return next;
      });
    }
    setDragIdx(null);
    setDy(0);
    dragRef.current = null;
  };

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>{label}</header>
      <ul className={styles.list}>
        {items.map((task, idx) => {
          const project = getProject(task.projectId);
          const accent = project ? PROJECT_COLOR_HEX[project.color] : '#8b95a1';
          const isDone = task.status === 'done';
          const isDragging = idx === dragIdx;

          let rowTranslateY = 0;
          if (isDragging) {
            rowTranslateY = dy;
          } else if (dragIdx !== null && targetIdx !== dragIdx) {
            if (targetIdx > dragIdx && idx > dragIdx && idx <= targetIdx) {
              rowTranslateY = -ROW_HEIGHT;
            } else if (targetIdx < dragIdx && idx < dragIdx && idx >= targetIdx) {
              rowTranslateY = ROW_HEIGHT;
            }
          }

          return (
            <li
              key={task.id}
              className={`${styles.row} ${isDragging ? styles.rowDragging : ''}`}
              style={{
                transform: `translateY(${rowTranslateY}px)`,
                transition: isDragging ? 'none' : 'transform 160ms ease',
                zIndex: isDragging ? 2 : 1,
              }}
            >
              <Link to="/tasks/$taskId" params={{ taskId: task.id }} className={styles.body}>
                <span className={styles.time}>{task.startAt}</span>
                <span className={styles.dot} style={{ background: isDone ? '#d1d6db' : accent }} />
                <span className={`${styles.title} ${isDone ? styles.titleDone : ''}`}>{task.title}</span>
              </Link>
              <button
                type="button"
                aria-label="순서 변경"
                className={styles.handle}
                onPointerDown={(e) => handleDown(e, idx)}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
              >
                <GripVertical size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
