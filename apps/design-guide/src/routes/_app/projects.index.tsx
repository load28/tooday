import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { IconPlus } from '@/components/icons';
import { MobileShell, shellStyles, type TabKey, TopBar } from '@/components/shell';
import { PROJECTS, type Project } from '@/lib/data';
import { NewProjectSheet } from '@/screens/new-project';
import { ProjectsList } from '@/screens/projects';

export const Route = createFileRoute('/_app/projects/')({
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [createOpen, setCreateOpen] = useState(false);
  const onTabChange = (k: TabKey) => {
    if (k === 'time') navigate({ to: '/' });
    else if (k === 'guide') navigate({ to: '/guide' });
  };

  return (
    <MobileShell
      topBar={
        <TopBar
          title="프로젝트"
          right={
            <button type="button" style={shellStyles.topBarBtn} aria-label="프로젝트 추가" onClick={() => setCreateOpen(true)}>
              <IconPlus size={22} strokeWidth={2.4} />
            </button>
          }
        />
      }
      tab="projects"
      onTabChange={onTabChange}
      showFab={false}
    >
      <ProjectsList
        projects={projects}
        onOpenProject={(id) => navigate({ to: '/projects/$projectId', params: { projectId: id } })}
        onAddProject={() => setCreateOpen(true)}
      />
      <NewProjectSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(p) => {
          setProjects((prev) => [...prev, p]);
          setCreateOpen(false);
        }}
      />
    </MobileShell>
  );
}
