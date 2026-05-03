import { Link } from '@tanstack/react-router';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { endTime, formatDuration, getProject, PROJECT_COLOR_HEX, type Task } from '@/data/mock';
import * as styles from './task-card.css';

const STATUS_ICON = {
  todo: Circle,
  doing: Loader2,
  done: CheckCircle2,
} as const;

const STATUS_COLOR = {
  todo: '#b0b8c1',
  doing: '#3182f6',
  done: '#00b8a3',
} as const;

export function TaskCard({ task, hideTime = false }: { task: Task; hideTime?: boolean }) {
  const project = getProject(task.projectId);
  const accent = project ? PROJECT_COLOR_HEX[project.color] : '#8b95a1';
  const Icon = STATUS_ICON[task.status];

  return (
    <Link to="/tasks/$taskId" params={{ taskId: task.id }} className={styles.root}>
      <div className={styles.accent} style={{ background: accent }} />
      <div className={styles.body}>
        <div className={styles.headerRow}>
          <h3 className={`${styles.title} ${task.status === 'done' ? styles.titleDone : ''}`}>{task.title}</h3>
          <Icon size={20} color={STATUS_COLOR[task.status]} strokeWidth={2} />
        </div>
        <div className={styles.metaRow}>
          {project ? (
            <span className={styles.projectChip}>
              <span className={styles.dot} style={{ background: accent }} />
              {project.name}
            </span>
          ) : null}
          {!hideTime ? (
            <>
              <span className={styles.sep} />
              <span>
                {task.startAt} – {endTime(task.startAt, task.durationMin)}
              </span>
              <span className={styles.sep} />
              <span>{formatDuration(task.durationMin)}</span>
            </>
          ) : null}
        </div>
        {task.note ? <p className={styles.note}>{task.note}</p> : null}
      </div>
    </Link>
  );
}
