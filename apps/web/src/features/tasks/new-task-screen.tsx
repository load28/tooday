import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { css } from 'styled-system/css';
import { NewProjectSheet } from '@/features/projects/new-project-sheet';
import {
  MetaList,
  MetaRow,
  NO_PROJECT_KEY,
  OptionSheet,
  ProjectValue,
  ScheduleSheet,
  ScheduleValue,
  useProjectOptions,
} from '@/features/tasks/task-fields';
import { useT } from '@/shared/i18n';
import { toIsoDate } from '@/shared/time';
import { AppBar, Button, Screen, Stack, Text } from '@/shared/ui';

const pageCls = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2xl',
  paddingInline: 'pageX',
  paddingTop: 'lg',
  paddingBottom: '4xl',
});

// 큰 제목 입력 — display 타이포를 그대로 쓰되 테두리 없는 인라인 입력으로 둔다
const titleInputCls = css({
  width: '100%',
  border: 'none',
  background: 'transparent',
  paddingInline: '2xs',
  outline: 'none',
  textStyle: 'display',
  color: 'text',
  fontFamily: 'inherit',
  _placeholder: { color: 'textPlaceholder' },
});

const fullWidthCls = css({ width: '100%' });

const DEFAULT_START = '09:00';
const DEFAULT_DURATION = 30;

type NewTaskScreenProps = {
  /** 기준 시각(epoch ms) — 새 태스크의 기본 날짜(오늘)를 SSR·하이드레이션에서 같게 잡는다 */
  now: number;
};

export function NewTaskScreen({ now }: NewTaskScreenProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const { trpc } = useRouteContext({ from: '__root__' });
  const t = useT();

  const { data } = useSuspenseQuery(trpc.task.projects.queryOptions());
  const projectOptions = useProjectOptions(data.projects);

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [startAt, setStartAt] = useState(DEFAULT_START);
  const [durationMin, setDurationMin] = useState(DEFAULT_DURATION);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [newProjectSheetOpen, setNewProjectSheetOpen] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);

  const selectedProject = useMemo(
    () => (projectId !== null ? (data.projects.find((project) => project.id === projectId) ?? null) : null),
    [data.projects, projectId],
  );

  const create = useMutation(
    trpc.task.create.mutationOptions({
      onSuccess: async () => {
        await navigate({ to: '/today' });
      },
    }),
  );

  const canCreate = title.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    create.mutate({ title: title.trim(), projectId, date: toIsoDate(new Date(now)), startAt, durationMin });
  };

  return (
    <Screen
      topBar={
        <AppBar>
          <AppBar.Leading>
            <Button size="icon" shape="square" aria-label={t.common.back} onClick={() => router.history.back()}>
              <ChevronLeft size={22} />
            </Button>
          </AppBar.Leading>
          <AppBar.Title>{t.taskNew.title}</AppBar.Title>
        </AppBar>
      }
    >
      <div className={pageCls}>
        <input
          // biome-ignore lint/a11y/noAutofocus: 새 태스크 진입 시 바로 제목을 입력하게 한다
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          placeholder={t.taskNew.titlePlaceholder}
          aria-label={t.taskNew.titlePlaceholder}
          className={titleInputCls}
        />

        <MetaList>
          <MetaRow
            label={t.taskNew.project}
            value={<ProjectValue name={selectedProject?.name ?? null} color={selectedProject?.color} />}
            onClick={() => setProjectSheetOpen(true)}
          />
          <MetaRow
            label={t.taskNew.time}
            value={<ScheduleValue startAt={startAt} durationMin={durationMin} />}
            onClick={() => setScheduleSheetOpen(true)}
          />
        </MetaList>

        <Stack gap="md">
          <Button
            tone="brand"
            size="xl"
            className={fullWidthCls}
            disabled={!canCreate}
            loading={create.isPending}
            onClick={handleCreate}
          >
            {t.taskNew.create}
          </Button>
          {create.isError ? (
            <Text variant="bodySm" tone="danger" align="center">
              {t.common.error.unexpected}
            </Text>
          ) : null}
        </Stack>
      </div>

      <OptionSheet
        open={projectSheetOpen}
        onClose={() => setProjectSheetOpen(false)}
        title={t.taskNew.selectProject}
        options={projectOptions}
        selectedKey={projectId ?? NO_PROJECT_KEY}
        onSelect={(key) => {
          setProjectId(key === NO_PROJECT_KEY ? null : key);
          setProjectSheetOpen(false);
        }}
        action={{
          label: t.taskNew.createProject,
          onClick: () => {
            setProjectSheetOpen(false);
            setNewProjectSheetOpen(true);
          },
        }}
      />

      <NewProjectSheet
        open={newProjectSheetOpen}
        onClose={() => setNewProjectSheetOpen(false)}
        onCreated={(project) => {
          setProjectId(project.id);
          setNewProjectSheetOpen(false);
        }}
      />

      <ScheduleSheet
        open={scheduleSheetOpen}
        onClose={() => setScheduleSheetOpen(false)}
        startAt={startAt}
        durationMin={durationMin}
        onApply={(nextStart, nextDuration) => {
          setStartAt(nextStart);
          setDurationMin(nextDuration);
          setScheduleSheetOpen(false);
        }}
      />
    </Screen>
  );
}
