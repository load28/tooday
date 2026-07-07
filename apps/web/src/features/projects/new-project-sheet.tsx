import { useMutation } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { PROJECT_COLORS, type Project, type ProjectColor } from '@tooday/shared';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { css } from 'styled-system/css';
import { token } from 'styled-system/tokens';
import { useT } from '@/shared/i18n';
import { PROJECT_COLOR } from '@/shared/project-color';
import { BottomSheet, Button, Stack, Text, TextField } from '@/shared/ui';

const fullWidthCls = css({ width: '100%' });
const colorRowCls = css({ display: 'flex', gap: 'md', paddingBlock: '2xs', paddingInline: '2xs' });

// 색상 칩 — 배경·선택 링 색은 프로젝트 색이라 인라인 style로, 나머지는 정적 클래스로 둔다
const colorChipCls = css({
  width: '40px',
  height: '40px',
  borderRadius: 'pill',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'textInverse',
  transition: 'transform {durations.fast} {easings.standard}, box-shadow {durations.fast} {easings.standard}',
});

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

  const [name, setName] = useState('');
  const [color, setColor] = useState<ProjectColor>('blue');

  const create = useMutation(
    trpc.task.createProject.mutationOptions({
      onSuccess: async ({ project }) => {
        await queryClient.invalidateQueries({ queryKey: trpc.task.projects.queryKey() });
        onCreated(project);
      },
    }),
  );

  const canCreate = name.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    create.mutate({ name: name.trim(), color });
  };

  return (
    <Stack gap="2xl">
      <TextField
        autoFocus
        label={t.projectNew.nameLabel}
        placeholder={t.projectNew.namePlaceholder}
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
      />

      <Stack gap="md">
        <Text variant="label" tone="secondary">
          {t.projectNew.colorLabel}
        </Text>
        <div className={colorRowCls}>
          {PROJECT_COLORS.map((option) => {
            const accent = PROJECT_COLOR[option];
            const active = option === color;
            return (
              <button
                key={option}
                type="button"
                aria-label={t.projectNew.color[option]}
                aria-pressed={active}
                className={colorChipCls}
                style={{
                  background: accent,
                  boxShadow: active ? `0 0 0 2px ${token('colors.surface')}, 0 0 0 4px ${accent}` : undefined,
                  transform: active ? 'scale(1.04)' : undefined,
                }}
                onClick={() => setColor(option)}
              >
                {active ? <Check size={18} strokeWidth={3} /> : null}
              </button>
            );
          })}
        </div>
      </Stack>

      <Stack gap="md">
        <Button
          tone="brand"
          size="lg"
          className={fullWidthCls}
          disabled={!canCreate}
          loading={create.isPending}
          onClick={handleCreate}
        >
          {t.projectNew.create}
        </Button>
        {create.isError ? (
          <Text variant="bodySm" tone="danger" align="center">
            {t.common.error.unexpected}
          </Text>
        ) : null}
      </Stack>
    </Stack>
  );
}
