import { revalidateLogic, useForm, useStore } from '@tanstack/react-form';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useRouteContext, useRouter } from '@tanstack/react-router';
import { type CreateTaskRequest, createTaskRequestSchema, type Project } from '@tooday/shared';
import { ChevronLeft } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { css } from 'styled-system/css';
import * as v from 'valibot';
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
import { AppBar, Button, Screen, Stack, Text } from '@/shared/ui';

const taskFormSchema = v.object({
  ...createTaskRequestSchema.entries,
});

type TaskFormValues = v.InferInput<typeof taskFormSchema>;

function toCreateTaskRequest({ title, projectId, date, startAt, durationMin }: TaskFormValues): CreateTaskRequest {
  return { title: title.trim(), projectId: projectId ?? null, date, startAt, durationMin };
}

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
  const { trpc } = useRouteContext({ from: '__root__' });
  const t = useT();

  const { data } = useSuspenseQuery(trpc.task.projects.queryOptions());
  const projectOptions = useProjectOptions(data.projects);

  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [newProjectSheetOpen, setNewProjectSheetOpen] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);

  const messages = useFormMessages(taskFormSchema, (t) => ({
    title: { min_length: t.taskNew.titleRequired },
  }));

  const create = useMutation(
    trpc.task.create.mutationOptions({
      onSuccess: async () => {
        await navigate({ to: '/today' });
      },
    }),
  );

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
          await create.mutateAsync(toCreateTaskRequest(value));
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
    () => (projectId !== null ? (data.projects.find((project) => project.id === projectId) ?? null) : null),
    [data.projects, projectId],
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
        className={pageCls}
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
                <input
                  // biome-ignore lint/a11y/noAutofocus: 새 태스크 진입 시 바로 제목을 입력하게 한다
                  autoFocus
                  name="title"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.currentTarget.value)}
                  placeholder={t.taskNew.titlePlaceholder}
                  aria-label={t.taskNew.titlePlaceholder}
                  className={titleInputCls}
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
            onClick={() => setProjectSheetOpen(true)}
          />
          <MetaRow
            label={t.taskNew.time}
            value={<ScheduleValue startAt={startAt} durationMin={durationMin} />}
            onClick={() => setScheduleSheetOpen(true)}
          />
        </MetaList>

        <Stack gap="md">
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
            {([values, isSubmitting]) => (
              <Button
                type="submit"
                tone="brand"
                size="xl"
                className={fullWidthCls}
                disabled={!values.title.trim()}
                loading={isSubmitting}
              >
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
        open={projectSheetOpen}
        onClose={() => setProjectSheetOpen(false)}
        title={t.taskNew.selectProject}
        options={projectOptions}
        selectedKey={projectId ?? NO_PROJECT_KEY}
        onSelect={(key) => {
          form.setFieldValue('projectId', key === NO_PROJECT_KEY ? null : key);
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

      {renderNewProjectSheet({
        open: newProjectSheetOpen,
        onClose: () => setNewProjectSheetOpen(false),
        onCreated: (project) => {
          form.setFieldValue('projectId', project.id);
          setNewProjectSheetOpen(false);
        },
      })}

      <ScheduleSheet
        open={scheduleSheetOpen}
        onClose={() => setScheduleSheetOpen(false)}
        startAt={startAt}
        durationMin={durationMin}
        onApply={(nextStart, nextDuration) => {
          form.setFieldValue('startAt', nextStart);
          form.setFieldValue('durationMin', nextDuration);
          setScheduleSheetOpen(false);
        }}
      />
    </Screen>
  );
}
