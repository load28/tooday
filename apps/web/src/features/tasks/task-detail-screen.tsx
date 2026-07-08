import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext, useRouter } from '@tanstack/react-router';
import type { Task, TaskPatch, TaskStatus, UpdateTaskRequest } from '@tooday/shared';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { css } from 'styled-system/css';
import { applyTaskPatch } from '@/entities/task/patch';
import { STATUS_CHIP_TONE, STATUS_DOT_TONE, STATUS_ORDER } from '@/entities/task/status';
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
import { useLocale, useT } from '@/shared/i18n';
import { optimisticPatch } from '@/shared/query';
import { AppBar, BaseButton, Button, Chip, Dot, Screen, Stack, Text } from '@/shared/ui';

const pageCls = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2xl',
  paddingInline: 'pageX',
  paddingTop: 'lg',
  paddingBottom: '4xl',
});

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

// 상태 알약을 감싸는 탭 타깃 — 리셋·포커스 링은 BaseButton이, 색은 Chip이 tone으로 관리한다
const statusButtonCls = css({
  alignSelf: 'flex-start',
  borderRadius: 'pill',
});

const fullWidthCls = css({ width: '100%' });

type TaskDetailScreenProps = {
  taskId: string;
};

export function TaskDetailScreen({ taskId }: TaskDetailScreenProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });
  const t = useT();
  const locale = useLocale();

  const {
    data: { task },
  } = useSuspenseQuery(trpc.task.byId.queryOptions({ id: taskId }));
  const {
    data: { projects },
  } = useSuspenseQuery(trpc.task.projects.queryOptions());
  const projectOptions = useProjectOptions(projects);

  const [titleDraft, setTitleDraft] = useState(task.title);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);

  const project = useMemo(
    () => (task.projectId !== null ? (projects.find((candidate) => candidate.id === task.projectId) ?? null) : null),
    [projects, task.projectId],
  );

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${task.date}T00:00`)),
    [locale, task.date],
  );

  const update = useMutation(
    trpc.task.update.mutationOptions(
      optimisticPatch(
        queryClient,
        trpc.task.byId.queryKey({ id: taskId }),
        (old: { task: Task }, { patch }: UpdateTaskRequest) => ({
          task: applyTaskPatch(old.task, patch),
        }),
      ),
    ),
  );

  const remove = useMutation(
    trpc.task.delete.mutationOptions({
      onSuccess: async () => {
        await navigate({ to: '/today' });
      },
    }),
  );

  const patch = (patch: TaskPatch) => update.mutate({ id: taskId, patch });

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (next && next !== task.title) patch({ title: next });
    else setTitleDraft(task.title);
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
          <AppBar.Title>{t.taskDetail.title}</AppBar.Title>
        </AppBar>
      }
    >
      <div className={pageCls}>
        <Stack gap="lg">
          <input
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.currentTarget.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setTitleDraft(task.title);
                event.currentTarget.blur();
              }
            }}
            aria-label={t.taskDetail.title}
            className={titleInputCls}
          />

          <BaseButton className={statusButtonCls} onClick={() => setStatusSheetOpen(true)}>
            <Chip tone={STATUS_CHIP_TONE[task.status]} size="lg" leading={<Dot size="sm" tone={STATUS_DOT_TONE[task.status]} />}>
              {t.common.status[task.status]}
            </Chip>
          </BaseButton>
        </Stack>

        <MetaList>
          <MetaRow
            label={t.taskDetail.project}
            value={<ProjectValue name={project?.name ?? null} color={project?.color} />}
            onClick={() => setProjectSheetOpen(true)}
          />
          <MetaRow label={t.taskDetail.date} value={<Text variant="bodyStrong">{dateLabel}</Text>} />
          <MetaRow
            label={t.taskDetail.time}
            value={<ScheduleValue startAt={task.startAt} durationMin={task.durationMin} />}
            onClick={() => setScheduleSheetOpen(true)}
          />
        </MetaList>

        <Stack gap="md">
          <Button
            tone="dangerSoft"
            size="lg"
            className={fullWidthCls}
            loading={remove.isPending}
            onClick={() => remove.mutate({ id: taskId })}
          >
            <Trash2 size={16} />
            {t.taskDetail.delete}
          </Button>
          {remove.isError ? (
            <Text variant="bodySm" tone="danger" align="center">
              {t.common.error.unexpected}
            </Text>
          ) : null}
        </Stack>
      </div>

      <OptionSheet<TaskStatus>
        open={statusSheetOpen}
        onClose={() => setStatusSheetOpen(false)}
        title={t.taskDetail.changeStatus}
        options={STATUS_ORDER.map((status) => ({
          key: status,
          label: t.common.status[status],
          leading: <Dot size="sm" tone={STATUS_DOT_TONE[status]} />,
        }))}
        selectedKey={task.status}
        onSelect={(status) => {
          if (status !== task.status) patch({ status });
          setStatusSheetOpen(false);
        }}
      />

      <OptionSheet
        open={projectSheetOpen}
        onClose={() => setProjectSheetOpen(false)}
        title={t.taskDetail.changeProject}
        options={projectOptions}
        selectedKey={task.projectId ?? NO_PROJECT_KEY}
        onSelect={(key) => {
          const nextProjectId = key === NO_PROJECT_KEY ? null : key;
          if (nextProjectId !== task.projectId) patch({ projectId: nextProjectId });
          setProjectSheetOpen(false);
        }}
      />

      <ScheduleSheet
        open={scheduleSheetOpen}
        onClose={() => setScheduleSheetOpen(false)}
        startAt={task.startAt}
        durationMin={task.durationMin}
        onApply={(startAt, durationMin) => {
          if (startAt !== task.startAt || durationMin !== task.durationMin) patch({ startAt, durationMin });
          setScheduleSheetOpen(false);
        }}
      />
    </Screen>
  );
}
