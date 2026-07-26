import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import { LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';
import { css } from 'styled-system/css';
import { token } from 'styled-system/tokens';
import { NewProjectSheet } from '@/features/projects/new-project-sheet';
import { format, useT } from '@/shared/i18n';
import { AppBar, Button, Card, Dot, HStack, ProgressBar, Screen, Stack, Text } from '@/shared/ui';

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

const emptyCls = css({ paddingY: 'emptyStateY', paddingInline: '4xl' });

/** 뷰포트와 하단 탭바는 `routes/_app/_tabs` 레이아웃이 소유한다 — 여기선 헤더·본문만 그린다. */
export function ProjectsScreen() {
  const navigate = useNavigate();
  const { trpc } = useRouteContext({ from: '__root__' });
  const t = useT();

  const {
    data: { projects },
  } = useSuspenseQuery(trpc.task.projects.queryOptions());

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Screen.Header>
        <AppBar>
          <AppBar.Title>{t.projects.title}</AppBar.Title>
          <AppBar.Trailing>
            <Button size="icon" shape="square" aria-label={t.projects.addProject} onClick={() => setCreateOpen(true)}>
              <Plus size={22} strokeWidth={2.4} />
            </Button>
          </AppBar.Trailing>
        </AppBar>
      </Screen.Header>
      <Screen.Content>
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
                  <ProgressBar value={ratio} tone={project.color} />
                  <Text variant="caption" tone="tertiary">
                    {format(t.projects.progress, { done: project.doneCount, total: project.totalCount })}
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
