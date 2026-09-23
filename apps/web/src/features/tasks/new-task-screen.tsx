import * as stylex from '@stylexjs/stylex';
import { useLiveSuspenseQuery } from '@tanstack/react-db';
import { revalidateLogic, useForm, useStore } from '@tanstack/react-form';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useAtom } from '@tanstack/react-store';
import { type CreateTaskRequest, createTaskRequestSchema, type Project } from '@tooday/shared';
import { ChevronLeft } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';
import * as v from 'valibot';
import { useTaskCommands, useTaskServerQueries } from '@/entities/task/context';
import { styles } from '@/features/tasks/new-task-screen.styles';
import { useNewTaskSheetStore } from '@/features/tasks/new-task-sheet-store';
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
import { fieldErrorMessage, formError, useFormMessages } from '@/shared/form';
import { useT } from '@/shared/i18n';
import { toIsoDate } from '@/shared/time';
import { AppBar, Button, Input, Screen, Stack, Text } from '@/shared/ui';

const taskFormSchema = v.object({
  ...createTaskRequestSchema.entries,
});

type TaskFormValues = v.InferInput<typeof taskFormSchema>;

function toCreateTaskRequest({ title, projectId, date, startAt, durationMin }: TaskFormValues): CreateTaskRequest {
  return { title: title.trim(), projectId: projectId ?? null, date, startAt, durationMin };
}

const DEFAULT_START = '09:00';
const DEFAULT_DURATION = 30;

/** 프로젝트 생성 시트 슬롯 계약 — projects feature의 NewProjectSheet props와 일치한다 */
type NewProjectSheetSlotProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
};

type NewTaskScreenProps = {
  /** 기준 시각(epoch ms) — 새 태스크의 기본 날짜(오늘)를 SSR·하이드레이션에서 같게 잡는다 */
  now: number;
  /** 프로젝트 생성 시트 — feature 간 직접 import 대신 라우트(배선 층)가 projects feature를 주입한다 */
  renderNewProjectSheet: (props: NewProjectSheetSlotProps) => ReactNode;
};

export function NewTaskScreen({ now, renderNewProjectSheet }: NewTaskScreenProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const taskQueries = useTaskServerQueries();
  const commands = useTaskCommands();
  const t = useT();

  const { data: projects } = useLiveSuspenseQuery(taskQueries.projectView());
  const projectOptions = useProjectOptions(projects);

  const { openSheetAtom } = useNewTaskSheetStore();
  const [openSheet, setOpenSheet] = useAtom(openSheetAtom);

  const messages = useFormMessages(taskFormSchema, (t) => ({
    title: { min_length: t.taskNew.titleRequired },
  }));

  const form = useForm({
    defaultValues: {
      title: '',
      projectId: null,
      date: toIsoDate(new Date(now)),
      startAt: DEFAULT_START,
      durationMin: DEFAULT_DURATION,
    } as TaskFormValues,
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: taskFormSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await commands.createTask(toCreateTaskRequest(value));
          await navigate({ to: '/today' });
        } catch {
          return formError(t.common.error.unexpected);
        }
      },
    },
  });

  const projectId = useStore(form.store, (state) => state.values.projectId) ?? null;
  const startAt = useStore(form.store, (state) => state.values.startAt);
  const durationMin = useStore(form.store, (state) => state.values.durationMin);

  const selectedProject = useMemo(
    () => (projectId !== null ? (projects.find((project) => project.id === projectId) ?? null) : null),
    [projects, projectId],
  );

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
      <form
        {...stylex.props(styles.page)}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="title">
          {(field) => {
            const error = fieldErrorMessage(field.state.meta.errors, messages.title);
            return (
              <Stack gap="sm">
                <Input
                  variant="inline"
                  // 새 태스크 진입 시 바로 제목을 입력하게 한다
                  autoFocus
                  name="title"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.currentTarget.value)}
                  placeholder={t.taskNew.titlePlaceholder}
                  aria-label={t.taskNew.titlePlaceholder}
                />
                {error !== undefined ? (
                  <Text variant="bodySm" tone="danger">
                    {error}
                  </Text>
                ) : null}
              </Stack>
            );
          }}
        </form.Field>

        <MetaList>
          <MetaRow
            label={t.taskNew.project}
            value={<ProjectValue name={selectedProject?.name ?? null} color={selectedProject?.color} />}
            onClick={() => setOpenSheet('project')}
          />
          <MetaRow
            label={t.taskNew.time}
            value={<ScheduleValue startAt={startAt} durationMin={durationMin} />}
            onClick={() => setOpenSheet('schedule')}
          />
        </MetaList>

        <Stack gap="md">
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
            {([values, isSubmitting]) => (
              <Button type="submit" tone="brand" size="xl" fullWidth disabled={!values.title.trim()} loading={isSubmitting}>
                {t.taskNew.create}
              </Button>
            )}
          </form.Subscribe>
          <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
            {(formError) =>
              typeof formError === 'string' ? (
                <Text variant="bodySm" tone="danger" align="center">
                  {formError}
                </Text>
              ) : null
            }
          </form.Subscribe>
        </Stack>
      </form>

      <OptionSheet
        open={openSheet === 'project'}
        onClose={() => setOpenSheet(null)}
        title={t.taskNew.selectProject}
        options={projectOptions}
        selectedKey={projectId ?? NO_PROJECT_KEY}
        onSelect={(key) => {
          form.setFieldValue('projectId', key === NO_PROJECT_KEY ? null : key);
          setOpenSheet(null);
        }}
        action={{
          label: t.taskNew.createProject,
          onClick: () => {
            setOpenSheet('newProject');
          },
        }}
      />

      {renderNewProjectSheet({
        open: openSheet === 'newProject',
        onClose: () => setOpenSheet(null),
        onCreated: (project) => {
          form.setFieldValue('projectId', project.id);
          setOpenSheet(null);
        },
      })}

      <ScheduleSheet
        open={openSheet === 'schedule'}
        onClose={() => setOpenSheet(null)}
        startAt={startAt}
        durationMin={durationMin}
        onApply={(nextStart, nextDuration) => {
          form.setFieldValue('startAt', nextStart);
          form.setFieldValue('durationMin', nextDuration);
          setOpenSheet(null);
        }}
      />
    </Screen>
  );
}
