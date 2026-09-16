import * as stylex from '@stylexjs/stylex';
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import { LayoutGrid, Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useTaskData } from '@/entities/task/context';
import { NewProjectSheet } from '@/features/projects/new-project-sheet';
import { styles } from '@/features/projects/projects-screen.styles';
import { useT } from '@/shared/i18n';
import { AppBar, Button, Card, Dot, HStack, ProgressBar, Screen, Stack, Text } from '@/shared/ui';

/** 뷰포트와 하단 탭바는 `routes/_app/_tabs` 레이아웃이 소유한다 — 여기선 헤더·본문만 그린다. */
export function ProjectsScreen() {
  const navigate = useNavigate();
  const { trpc } = useRouteContext({ from: '__root__' });
  const t = useT();
  const taskData = useTaskData();
  const { data: projects } = useLiveSuspenseQuery(taskData.projectView());

  const {
    data: { projects: summaries },
  } = useSuspenseQuery(trpc.task.projects.queryOptions());

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Screen.Header>
        <AppBar>
          <AppBar.Title>{t.projects.title}</AppBar.Title>
          <AppBar.Trailing>
            <Button size="icon" shape="square" aria-label={t.settings.open} onClick={() => navigate({ to: '/settings' })}>
              <UserRound size={20} />
            </Button>
            <Button size="icon" shape="square" aria-label={t.projects.addProject} onClick={() => setCreateOpen(true)}>
              <Plus size={22} strokeWidth={2.4} />
            </Button>
          </AppBar.Trailing>
        </AppBar>
      </Screen.Header>
      <Screen.Content>
        <div {...stylex.props(styles.hero)}>
          <Stack gap="2xs">
            <Text as="h1" variant="title">
              {t.projects.title}
            </Text>
            <Text variant="bodySm" tone="tertiary">
              {t.projects.subtitle}
            </Text>
          </Stack>
        </div>

        {projects.length === 0 ? (
          <Stack gap="sm" align="center" sx={styles.empty}>
            <LayoutGrid size={36} {...stylex.props(styles.emptyIcon)} />
            <Text variant="bodyLgStrong" tone="secondary">
              {t.projects.empty}
            </Text>
          </Stack>
        ) : (
          <Stack gap="md" sx={styles.list}>
            {projects.map((project) => {
              const summary = summaries.find((item) => item.id === project.id);
              const totalCount = summary?.totalCount ?? 0;
              const doneCount = summary?.doneCount ?? 0;
              const ratio = totalCount > 0 ? doneCount / totalCount : 0;
              return (
                <Card
                  key={project.id}
                  as="button"
                  interactive
                  radius="2xl"
                  padding="lg"
                  sx={styles.card}
                  onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: project.id } })}
                >
                  <HStack gap="sm">
                    <Dot size="sm" tone={project.color} />
                    <Text variant="subtitle" truncate>
                      {project.name}
                    </Text>
                  </HStack>
                  <ProgressBar value={ratio} tone={project.color} />
                  <Text variant="caption" tone="tertiary">
                    {t.projects.progress({ done: doneCount, total: totalCount })}
                  </Text>
                </Card>
              );
            })}
          </Stack>
        )}

        <NewProjectSheet open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />
      </Screen.Content>
    </>
  );
}
