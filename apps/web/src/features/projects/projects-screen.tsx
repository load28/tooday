import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import { CalendarDays, LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';
import { css } from 'styled-system/css';
import { token } from 'styled-system/tokens';
import { NewProjectSheet } from '@/features/projects/new-project-sheet';
import { format, useT } from '@/shared/i18n';
import { PROJECT_COLOR } from '@/shared/project-color';
import { AppBar, Button, Card, Dot, HStack, Screen, Stack, TabBar, Text } from '@/shared/ui';

const heroCls = css({
  paddingInline: 'pageX',
  paddingTop: 'md',
  paddingBottom: 'lg',
});

const listCls = css({
  paddingInline: 'pageX',
  paddingBottom: '4xl',
});

const cardCls = css({
  display: 'flex',
  flexDirection: 'column',
  gap: 'md',
  width: '100%',
  textAlign: 'left',
});

const trackCls = css({
  height: '4px',
  borderRadius: 'pill',
  bg: 'surfaceSoft',
  overflow: 'hidden',
});

const fillCls = css({
  height: '100%',
  borderRadius: 'pill',
  transition: 'width {durations.slow} {easings.standard}',
});

const emptyCls = css({ paddingY: '60px', paddingInline: '4xl' });

export function ProjectsScreen() {
  const navigate = useNavigate();
  const { trpc } = useRouteContext({ from: '__root__' });
  const t = useT();

  const {
    data: { projects },
  } = useSuspenseQuery(trpc.task.projects.queryOptions());

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Screen
      topBar={
        <AppBar>
          <AppBar.Title>{t.projects.title}</AppBar.Title>
          <AppBar.Trailing>
            <Button size="icon" shape="square" aria-label={t.projects.addProject} onClick={() => setCreateOpen(true)}>
              <Plus size={22} strokeWidth={2.4} />
            </Button>
          </AppBar.Trailing>
        </AppBar>
      }
      bottomBar={
        <TabBar
          aria-label={t.nav.label}
          items={[
            { key: 'today', label: t.nav.today, icon: <CalendarDays size={22} /> },
            { key: 'projects', label: t.nav.projects, icon: <LayoutGrid size={22} /> },
          ]}
          activeKey="projects"
          onSelect={(key) => {
            if (key === 'today') void navigate({ to: '/today' });
          }}
        />
      }
    >
      <div className={heroCls}>
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
        <Stack gap="sm" align="center" className={emptyCls}>
          <LayoutGrid size={36} color={token('colors.borderStrong')} />
          <Text variant="bodyLgStrong" tone="secondary">
            {t.projects.empty}
          </Text>
        </Stack>
      ) : (
        <Stack gap="md" className={listCls}>
          {projects.map((project) => {
            const accent = PROJECT_COLOR[project.color];
            const ratio = project.totalCount > 0 ? project.doneCount / project.totalCount : 0;
            return (
              <Card
                key={project.id}
                as="button"
                interactive
                radius="2xl"
                padding="lg"
                className={cardCls}
                onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: project.id } })}
              >
                <HStack gap="sm">
                  <Dot size="sm" tone={project.color} />
                  <Text variant="subtitle" truncate>
                    {project.name}
                  </Text>
                </HStack>
                <div className={trackCls}>
                  <div className={fillCls} style={{ width: `${ratio * 100}%`, background: accent }} />
                </div>
                <Text variant="caption" tone="tertiary">
                  {format(t.projects.progress, { done: project.doneCount, total: project.totalCount })}
                </Text>
              </Card>
            );
          })}
        </Stack>
      )}

      <NewProjectSheet open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />
    </Screen>
  );
}
