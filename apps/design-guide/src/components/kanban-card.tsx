import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { getProject, PROJECT_COLOR_HEX, type Task } from '@/data/mock';
import * as styles from './kanban-card.css';

export function KanbanCard({ task }: { task: Task }) {
  const project = getProject(task.projectId);
  const accent = project ? PROJECT_COLOR_HEX[project.color] : '#8b95a1';
  const isDone = task.status === 'done';

  return (
    <Link to="/tasks/$taskId" params={{ taskId: task.id }} className={styles.row}>
      {isDone ? (
        <Check size={16} strokeWidth={2.6} className={styles.doneIcon} />
      ) : (
        <span className={styles.dot} style={{ background: accent }} />
      )}
      <span className={`${styles.title} ${isDone ? styles.titleDone : ''}`}>{task.title}</span>
      <span className={styles.time}>{task.startAt}</span>
    </Link>
  );
}
