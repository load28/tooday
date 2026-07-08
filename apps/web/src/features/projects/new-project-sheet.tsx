import { revalidateLogic, useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { type CreateProjectRequest, createProjectRequestSchema, PROJECT_COLORS, type Project } from '@tooday/shared';
import { Check } from 'lucide-react';
import { css } from 'styled-system/css';
import * as v from 'valibot';
import { fieldErrorMessage, formError, useFormMessages } from '@/shared/form';
import { useT } from '@/shared/i18n';
import { BottomSheet, Button, ColorSwatchGroup, Stack, Text, TextField } from '@/shared/ui';

const projectFormSchema = v.object({
  ...createProjectRequestSchema.entries,
});

type ProjectFormValues = v.InferInput<typeof projectFormSchema>;

function toCreateProjectRequest({ name, color }: ProjectFormValues): CreateProjectRequest {
  return { name: name.trim(), color };
}

const fullWidthCls = css({ width: '100%' });
const colorRowCls = css({ paddingBlock: '2xs', paddingInline: '2xs' });

type NewProjectSheetProps = {
  open: boolean;
  onClose: () => void;
  /** 생성 성공 시 — 시트 닫기·생성된 프로젝트 선택 등은 호출부가 결정한다 */
  onCreated: (project: Project) => void;
};

/**
 * 새 프로젝트 생성 바텀시트 — 이름 + 색상.
 * 시트는 닫히면 unmount 되므로(BottomSheet lazyMount) 다시 열 때 폼이 새로 초기화된다.
 */
export function NewProjectSheet({ open, onClose, onCreated }: NewProjectSheetProps) {
  const t = useT();
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel={t.projectNew.title}>
      <BottomSheet.Header>
        <BottomSheet.Title>{t.projectNew.title}</BottomSheet.Title>
      </BottomSheet.Header>
      <NewProjectForm onCreated={onCreated} />
    </BottomSheet>
  );
}

function NewProjectForm({ onCreated }: { onCreated: (project: Project) => void }) {
  const { trpc, queryClient } = useRouteContext({ from: '__root__' });
  const t = useT();

  const messages = useFormMessages(projectFormSchema, (t) => ({
    name: { min_length: t.projectNew.nameRequired },
  }));

  const create = useMutation(
    trpc.task.createProject.mutationOptions({
      onSuccess: async ({ project }) => {
        await queryClient.invalidateQueries({ queryKey: trpc.task.projects.queryKey() });
        onCreated(project);
      },
    }),
  );

  const form = useForm({
    defaultValues: { name: '', color: 'blue' } as ProjectFormValues,
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: projectFormSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await create.mutateAsync(toCreateProjectRequest(value));
        } catch {
          return formError(t.common.error.unexpected);
        }
      },
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <Stack gap="2xl">
        <form.Field name="name">
          {(field) => (
            <TextField
              autoFocus
              label={t.projectNew.nameLabel}
              name="name"
              placeholder={t.projectNew.namePlaceholder}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.currentTarget.value)}
              error={fieldErrorMessage(field.state.meta.errors, messages.name)}
            />
          )}
        </form.Field>

        <Stack gap="md">
          <Text variant="label" tone="secondary">
            {t.projectNew.colorLabel}
          </Text>
          <form.Field name="color">
            {(field) => (
              <ColorSwatchGroup
                value={field.state.value}
                onValueChange={field.handleChange}
                aria-label={t.projectNew.colorLabel}
                className={colorRowCls}
              >
                {PROJECT_COLORS.map((option) => (
                  <ColorSwatchGroup.Item key={option} value={option} tone={option} aria-label={t.projectNew.color[option]}>
                    <ColorSwatchGroup.Indicator>
                      <Check size={18} strokeWidth={3} />
                    </ColorSwatchGroup.Indicator>
                  </ColorSwatchGroup.Item>
                ))}
              </ColorSwatchGroup>
            )}
          </form.Field>
        </Stack>

        <Stack gap="md">
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
            {([values, isSubmitting]) => (
              <Button
                type="submit"
                tone="brand"
                size="lg"
                className={fullWidthCls}
                disabled={!values.name.trim()}
                loading={isSubmitting}
              >
                {t.projectNew.create}
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
      </Stack>
    </form>
  );
}
