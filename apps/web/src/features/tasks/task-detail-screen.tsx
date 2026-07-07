import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext, useRouter } from '@tanstack/react-router';
import type { Task, TaskPatch, TaskStatus } from '@tooday/shared';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { css } from 'styled-system/css';
import { STATUS_CHIP_TONE, STATUS_DOT_TONE, STATUS_ORDER } from '@/features/tasks/status';
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
import { AppBar, Button, Chip, Dot, Pressable, Screen, Stack, Text } from '@/shared/ui';

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

// 상태 알약을 감싸는 탭 타깃 — 색은 Chip이 tone으로 관리하므로 여기선 레이아웃만 준다
const statusButtonCls = css({
  alignSelf: 'flex-start',
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  borderRadius: 'pill',
  _focusVisible: { outline: 'none', boxShadow: 'focus' },
});

const fullWidthCls = css({ width: '100%' });

/** 낙관적 캐시 패치용 — patch에서 값이 지정된 필드만 (undefined 스프레드로 기존 값을 지우지 않게) */
function definedFields(patch: TaskPatch): Partial<Task> {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<Task>;
}

type TaskDetailScreenProps = {
  taskId: string;
};

export function TaskDetailScreen({ taskId }: TaskDetailScreenProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });
  const t = useT();
  const locale = useLocale();

  const byIdOptions = trpc.task.byId.queryOptions({ id: taskId });
  const {
    data: { task },
  } = useSuspenseQuery(byIdOptions);
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
    trpc.task.update.mutationOptions({
      onMutate: async ({ patch }) => {
        await queryClient.cancelQueries({ queryKey: byIdOptions.queryKey });
        const previous = queryClient.getQueryData(byIdOptions.queryKey);
        queryClient.setQueryData(
          byIdOptions.queryKey,
          (old: { task: Task } | undefined) =>
            old && { task: { ...old.task, ...definedFields(patch), version: old.task.version + 1 } },
        );
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous) queryClient.setQueryData(byIdOptions.queryKey, context.previous);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: byIdOptions.queryKey }),
    }),
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
            <Pressable size="icon" shape="square" aria-label={t.common.back} onClick={() => router.history.back()}>
              <ChevronLeft size={22} />
            </Pressable>
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

          <button type="button" className={statusButtonCls} onClick={() => setStatusSheetOpen(true)}>
            <Chip tone={STATUS_CHIP_TONE[task.status]} size="lg" leading={<Dot size="sm" tone={STATUS_DOT_TONE[task.status]} />}>
              {t.common.status[task.status]}
            </Chip>
          </button>
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
