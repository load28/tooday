import { createFileRoute, notFound } from '@tanstack/react-router';
import { KanbanCard } from '@/components/kanban-card';
import { MobileShell, TopBar } from '@/components/mobile-shell';
import { getProject, PROJECT_COLOR_HEX, type TaskStatus, tasksByProject } from '@/data/mock';
import * as styles from './projects.css';

export const Route = createFileRoute('/_app/projects/$projectId')({
  component: ProjectDetail,
});

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: '할 일' },
  { key: 'doing', label: '진행 중' },
  { key: 'done', label: '완료' },
];

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const project = getProject(projectId);
  if (!project) throw notFound();

  const accent = PROJECT_COLOR_HEX[project.color];
  const allTasks = tasksByProject(project.id);
  const total = project.totalCount;
  const done = project.doneCount;
  const ratio = total === 0 ? 0 : done / total;

  return (
    <MobileShell topBar={<TopBar title={project.name} showBack />}>
      <section className={styles.detailHero}>
        <h1 className={styles.detailTitle}>{project.name}</h1>
        <p className={styles.detailDesc}>{project.description}</p>
        <div className={styles.detailStat}>
          <span className={styles.detailStatNum}>{done}</span>
          <span className={styles.detailStatTotal}>/ {total} 완료</span>
        </div>
        <div className={styles.detailProgressTrack}>
          <div className={styles.detailProgressFill} style={{ width: `${Math.round(ratio * 100)}%`, background: accent }} />
        </div>
      </section>

      <div className={styles.kanbanStack}>
        {COLUMNS.map(({ key, label }) => {
          const items = allTasks.filter((t) => t.status === key);
          return (
            <section key={key} className={styles.kanbanSection} aria-label={label}>
              <header className={styles.sectionHeader}>
                <span className={styles.sectionLabel}>{label}</span>
                <span className={styles.sectionCount}>{items.length}</span>
              </header>
              {items.length === 0 ? (
                <div className={styles.sectionEmpty}>비어 있음</div>
              ) : (
                <ul className={styles.taskList}>
                  {items.map((task) => (
                    <li key={task.id}>
                      <KanbanCard task={task} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </MobileShell>
  );
}
