import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { card } from '@/components/atoms.css';
import { MobileShell, TopBar } from '@/components/mobile-shell';
import { PROJECT_COLOR_HEX, projects, tasksByProject } from '@/data/mock';
import * as styles from './projects.css';

export const Route = createFileRoute('/_app/projects/')({
  component: ProjectList,
});

function ProjectList() {
  return (
    <MobileShell topBar={<TopBar title="프로젝트" />}>
      <header className={styles.intro}>
        <h1 className={styles.introTitle}>프로젝트</h1>
        <p className={styles.introCaption}>한 곳에서 모아보기</p>
      </header>

      <ul className={styles.projectList}>
        {projects.map((project) => {
          const projectTasks = tasksByProject(project.id);
          const total = project.totalCount;
          const done = project.doneCount;
          const ratio = total === 0 ? 0 : done / total;
          const accent = PROJECT_COLOR_HEX[project.color];
          const todayCount = projectTasks.length;

          return (
            <li key={project.id} className={card}>
              <Link to="/projects/$projectId" params={{ projectId: project.id }} className={styles.projectRow}>
                <span aria-hidden="true" className={styles.projectAccent} style={{ background: accent }} />
                <div className={styles.projectHead}>
                  <span className={styles.projectName}>{project.name}</span>
                  <ChevronRight size={16} className={styles.projectChev} />
                </div>
                <p className={styles.projectDesc}>
                  {project.description}
                  {todayCount > 0 ? ` · 오늘 ${todayCount}개` : ''}
                </p>
                <div className={styles.progressRow}>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${Math.round(ratio * 100)}%`, background: accent }} />
                  </div>
                  <span className={styles.progressLabel}>
                    {done} / {total}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </MobileShell>
  );
}
