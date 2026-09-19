import * as stylex from '@stylexjs/stylex';
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useAtom } from '@tanstack/react-store';
import type { Project, Task, TaskStatus } from '@tooday/shared';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTaskCommands, useTaskServerQueries } from '@/entities/task/context';
import { STATUS_CHIP_TONE, STATUS_DOT_TONE, STATUS_ORDER } from '@/entities/task/status';
import { useTaskDetailSheetStore } from '@/features/tasks/detail-sheet-store';
import { styles } from '@/features/tasks/task-detail-screen.styles';
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
import { useCommandExecutionStore } from '@/shared/command-execution-store';
import { useLocale, useT } from '@/shared/i18n';
import { formatDateLabel, parseIsoDate } from '@/shared/time';
import { AppBar, BaseButton, Button, Chip, Dot, Input, Screen, Stack, Text } from '@/shared/ui';

type TaskDetailScreenProps = {
  taskId: string;
};

export function TaskDetailScreen({ taskId }: TaskDetailScreenProps) {
  const taskQueries = useTaskServerQueries();
  const t = useT();
  const { data: tasks } = useLiveSuspenseQuery(taskQueries.taskView({ kind: 'task', id: taskId }));
  const { data: projects } = useLiveSuspenseQuery(taskQueries.projectView());
  const task = tasks[0];
  if (!task)
    return (
      <Screen>
        <Text>{t.taskDetail.notFound}</Text>
      </Screen>
    );
  return <TaskEditor key={task.id} task={task} projects={projects} />;
}

function TaskEditor({ task, projects }: { task: Task; projects: Project[] }) {
  const taskId = task.id;
  const navigate = useNavigate();
  const router = useRouter();
  const commands = useTaskCommands();
  const t = useT();
  const locale = useLocale();
  const projectOptions = useProjectOptions(projects);
  // null은 미편집 상태다. 원격 제목은 미편집 상태에서만 즉시 표시한다.
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const { openDetailSheetAtom } = useTaskDetailSheetStore();
  const [activeSheet, setTaskDetailSheet] = useAtom(openDetailSheetAtom);

  const project = useMemo(
    () => (task.projectId !== null ? (projects.find((candidate) => candidate.id === task.projectId) ?? null) : null),
    [projects, task.projectId],
  );

  const dateLabel = useMemo(() => formatDateLabel(locale, parseIsoDate(task.date), 'short'), [locale, task.date]);

  const update = useCommandExecutionStore();
  const remove = useCommandExecutionStore();

  const commitTitle = () => {
    if (titleDraft === null) return;
    const submitted = titleDraft;
    const next = submitted.trim();
    if (!next || next === task.title) {
      setTitleDraft(null);
      return;
    }
    update.dispatch(async () => {
      await commands.renameTask({ taskId, title: next });
      setTitleDraft((current) => (current === submitted ? null : current));
    });
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
      <div {...stylex.props(styles.page)}>
        <Stack gap="lg">
          <Input
            variant="inline"
            value={titleDraft ?? task.title}
            onChange={(event) => setTitleDraft(event.currentTarget.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                event.preventDefault();
                setTitleDraft(null);
              }
            }}
            aria-label={t.taskDetail.title}
          />

          <BaseButton sx={styles.statusButton} onClick={() => setTaskDetailSheet('status')}>
            <Chip tone={STATUS_CHIP_TONE[task.status]} size="lg" leading={<Dot size="sm" tone={STATUS_DOT_TONE[task.status]} />}>
              {t.common.status[task.status]}
            </Chip>
          </BaseButton>
        </Stack>

        <MetaList>
          <MetaRow
            label={t.taskDetail.project}
            value={<ProjectValue name={project?.name ?? null} color={project?.color} />}
            onClick={() => setTaskDetailSheet('project')}
          />
          <MetaRow label={t.taskDetail.date} value={<Text variant="bodyStrong">{dateLabel}</Text>} />
          <MetaRow
            label={t.taskDetail.time}
            value={<ScheduleValue startAt={task.startAt} durationMin={task.durationMin} />}
            onClick={() => setTaskDetailSheet('schedule')}
          />
        </MetaList>

        <Stack gap="md">
          <Button
            tone="dangerSoft"
            size="lg"
            fullWidth
            loading={remove.isPending}
            onClick={() =>
              remove.dispatch(async () => {
                await commands.deleteTask({ taskId });
                await navigate({ to: '/today' });
              })
            }
          >
            <Trash2 size={16} />
            {t.taskDetail.delete}
          </Button>
          {remove.isError || update.isError ? (
            <Text variant="bodySm" tone="danger" align="center">
              {t.common.error.unexpected}
            </Text>
          ) : null}
        </Stack>
      </div>

      <OptionSheet<TaskStatus>
        open={activeSheet === 'status'}
        onClose={() => setTaskDetailSheet(null)}
        title={t.taskDetail.changeStatus}
        options={STATUS_ORDER.map((status) => ({
          key: status,
          label: t.common.status[status],
          leading: <Dot size="sm" tone={STATUS_DOT_TONE[status]} />,
        }))}
        selectedKey={task.status}
        onSelect={(status) => {
          if (status !== task.status) update.dispatch(() => commands.setTaskStatus({ taskId, status }));
          setTaskDetailSheet(null);
        }}
      />

      <OptionSheet
        open={activeSheet === 'project'}
        onClose={() => setTaskDetailSheet(null)}
        title={t.taskDetail.changeProject}
        options={projectOptions}
        selectedKey={task.projectId ?? NO_PROJECT_KEY}
        onSelect={(key) => {
          const nextProjectId = key === NO_PROJECT_KEY ? null : key;
          if (nextProjectId !== task.projectId)
            update.dispatch(() => commands.moveTaskToProject({ taskId, projectId: nextProjectId }));
          setTaskDetailSheet(null);
        }}
      />

      <ScheduleSheet
        open={activeSheet === 'schedule'}
        onClose={() => setTaskDetailSheet(null)}
        startAt={task.startAt}
        durationMin={task.durationMin}
        onApply={(startAt, durationMin) => {
          if (startAt !== task.startAt || durationMin !== task.durationMin)
            update.dispatch(() => commands.rescheduleTask({ taskId, startAt, durationMin }));
          setTaskDetailSheet(null);
        }}
      />
    </Screen>
  );
}
