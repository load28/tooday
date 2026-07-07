import { type CSSProperties, useState } from 'react';
import { BottomSheet } from '@/components/bottom-sheet';
import { IconCheck } from '@/components/icons';
import type { Project } from '@/lib/data';
import { PROJECT_COLOR_HEX, type ProjectColor, TOKENS } from '@/lib/tokens';
import { taskDetailStyles } from './task-detail';

const COLOR_ORDER: ProjectColor[] = ['blue', 'mint', 'violet', 'amber', 'pink', 'gray'];

const newProjStyles: Record<string, CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 4 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: 700, color: TOKENS.color.textTertiary },
  input: {
    width: '100%',
    height: 52,
    padding: '0 16px',
    border: '1.5px solid transparent',
    borderRadius: 14,
    background: TOKENS.color.surfaceSoft,
    fontFamily: 'inherit',
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: '-0.01em',
    color: TOKENS.color.textPrimary,
    outline: 'none',
  },
  colorRow: { display: 'flex', gap: 12, padding: '2px 2px' },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'transform 120ms ease, box-shadow 120ms ease',
  },
};

let customSeq = 0;

type NewProjectFormProps = { onCreate: (project: Project) => void };

function NewProjectForm({ onCreate }: NewProjectFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<ProjectColor>('blue');
  const [description, setDescription] = useState('');
  const canCreate = name.trim().length > 0;

  const create = () => {
    if (!canCreate) return;
    customSeq += 1;
    onCreate({
      id: `p-custom-${customSeq}`,
      name: name.trim(),
      color,
      description: description.trim() || '설명 없음',
      totalCount: 0,
      doneCount: 0,
    });
  };

  return (
    <div style={newProjStyles.form}>
      <div style={newProjStyles.field}>
        <span style={newProjStyles.fieldLabel}>이름</span>
        <input
          // biome-ignore lint/a11y/noAutofocus: 시트 열림과 동시에 이름 입력 시작
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="프로젝트 이름"
          style={newProjStyles.input}
        />
      </div>

      <div style={newProjStyles.field}>
        <span style={newProjStyles.fieldLabel}>색상</span>
        <div style={newProjStyles.colorRow}>
          {COLOR_ORDER.map((c) => {
            const hex = PROJECT_COLOR_HEX[c];
            const active = color === c;
            return (
              <button
                key={c}
                type="button"
                aria-label={`${c} 색상`}
                aria-pressed={active}
                onClick={() => setColor(c)}
                style={{
                  ...newProjStyles.colorChip,
                  background: hex,
                  boxShadow: active ? `0 0 0 2px ${TOKENS.color.surface}, 0 0 0 4px ${hex}` : 'none',
                  transform: active ? 'scale(1.04)' : 'scale(1)',
                }}
              >
                {active ? <IconCheck size={18} strokeWidth={3} stroke="#fff" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div style={newProjStyles.field}>
        <span style={newProjStyles.fieldLabel}>설명 (선택)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="무엇을 위한 프로젝트인가요?"
          style={newProjStyles.input}
        />
      </div>

      <button
        type="button"
        disabled={!canCreate}
        onClick={create}
        style={{
          ...taskDetailStyles.primaryBtn,
          marginTop: 4,
          background: canCreate ? TOKENS.color.primary : TOKENS.color.borderStrong,
          cursor: canCreate ? 'pointer' : 'not-allowed',
        }}
      >
        만들기
      </button>
    </div>
  );
}

type NewProjectSheetProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (project: Project) => void;
};

export function NewProjectSheet({ open, onClose, onCreate }: NewProjectSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="새 프로젝트">
      <NewProjectForm onCreate={onCreate} />
    </BottomSheet>
  );
}
