import { type CSSProperties, useState } from 'react';
import { BottomSheet } from '@/components/bottom-sheet';
import { IconCheck, IconChevronRight, IconPlus, IconTrash, IconX } from '@/components/icons';
import {
  type ChecklistItem,
  endTime,
  formatDuration,
  getProject,
  PROJECTS,
  type Task,
  type TaskStatus,
  TODAY_LABEL,
} from '@/lib/data';
import { PROJECT_COLOR_HEX, type ProjectColor, TOKENS } from '@/lib/tokens';

export const taskDetailStyles: Record<string, CSSProperties> = {
  page: { padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 18 },

  titleBlock: { padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 12 },
  title: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    margin: 0,
    color: TOKENS.color.textPrimary,
    lineHeight: 1.2,
  },
  statusPill: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 14px',
    borderRadius: 999,
    border: 'none',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  statusDot: { width: 7, height: 7, borderRadius: 999 },

  card: {
    background: TOKENS.color.surface,
    borderRadius: 16,
    boxShadow: TOKENS.shadow.card,
    overflow: 'hidden',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 56,
    padding: '0 18px',
    border: 'none',
    background: 'transparent',
    fontFamily: 'inherit',
    cursor: 'pointer',
    textAlign: 'left',
  },
  metaRowDivider: { borderTop: `1px solid ${TOKENS.color.divider}` },
  metaKey: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    color: TOKENS.color.textTertiary,
    fontWeight: 600,
  },
  metaVal: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    color: TOKENS.color.textPrimary,
  },
  metaHint: { fontSize: 12, color: TOKENS.color.textTertiary, fontWeight: 600 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: TOKENS.color.textTertiary,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    padding: '0 4px',
  },
  sectionRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: '0 4px',
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: 700,
    color: TOKENS.color.textPlaceholder,
    fontFeatureSettings: '"tnum" 1',
  },

  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 18px',
    height: 50,
    borderTop: `1px solid ${TOKENS.color.divider}`,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1.5px solid ${TOKENS.color.borderStrong}`,
    background: TOKENS.color.surface,
    cursor: 'pointer',
    padding: 0,
    transition: 'all 160ms ease',
  },
  checkBoxDone: {
    background: TOKENS.color.primary,
    borderColor: TOKENS.color.primary,
    color: '#fff',
  },
  checkInput: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    padding: 0,
    fontSize: 14,
    fontWeight: 600,
    color: TOKENS.color.textPrimary,
    fontFamily: 'inherit',
  },
  checkInputDone: { color: TOKENS.color.textTertiary, textDecoration: 'line-through' },
  addRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 50,
    padding: '0 18px',
    width: '100%',
    border: 'none',
    borderTop: `1px solid ${TOKENS.color.divider}`,
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 700,
    color: TOKENS.color.textTertiary,
    cursor: 'pointer',
    textAlign: 'left',
  },
  memoCard: { padding: 18 },
  memoInput: {
    width: '100%',
    minHeight: 96,
    border: 'none',
    background: 'transparent',
    padding: 0,
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    fontSize: 14,
    color: TOKENS.color.textPrimary,
    lineHeight: 1.55,
  },
  deleteBtn: {
    width: '100%',
    height: 52,
    border: 'none',
    background: TOKENS.color.surface,
    borderRadius: 14,
    boxShadow: TOKENS.shadow.sm,
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 700,
    color: TOKENS.color.danger,
    cursor: 'pointer',
  },

  optList: { display: 'flex', flexDirection: 'column', gap: 2 },
  optRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 8px',
    border: 'none',
    background: 'transparent',
    width: '100%',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  optDot: { width: 12, height: 12, borderRadius: 999, flex: '0 0 auto' },
  optLabel: { flex: 1, textAlign: 'left', fontSize: 16, fontWeight: 600, color: TOKENS.color.textPrimary },

  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: 700, color: TOKENS.color.textTertiary },
  timeInput: {
    width: '100%',
    height: 52,
    padding: '0 16px',
    border: `1px solid ${TOKENS.color.border}`,
    borderRadius: 12,
    background: TOKENS.color.surface,
    fontFamily: 'inherit',
    fontSize: 16,
    fontWeight: 700,
    color: TOKENS.color.textPrimary,
    outline: 'none',
  },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  pill: {
    height: 38,
    padding: '0 16px',
    border: `1px solid ${TOKENS.color.border}`,
    background: TOKENS.color.surface,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    color: TOKENS.color.textSecondary,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 160ms ease',
  },
  pillActive: {
    background: TOKENS.color.primary,
    color: '#fff',
    borderColor: TOKENS.color.primary,
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    border: 'none',
    borderRadius: 14,
    background: TOKENS.color.primary,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '-0.01em',
    transition: 'background 120ms ease',
  },
};

const STATUS_LABEL: Record<TaskStatus, string> = { todo: '할 일', doing: '진행 중', done: '완료' };
const STATUS_DOT_COLOR: Record<TaskStatus, string> = {
  todo: TOKENS.color.borderStrong,
  doing: TOKENS.color.primary,
  done: TOKENS.color.success,
};
const STATUS_PILL_VAR: Record<TaskStatus, CSSProperties> = {
  todo: { background: TOKENS.color.surfaceSoft, color: TOKENS.color.textSecondary },
  doing: { background: TOKENS.color.primarySoft, color: TOKENS.color.primary },
  done: { background: TOKENS.color.successSoft, color: TOKENS.color.success },
};
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

type TaskDetailProps = {
  task: Task;
  onDelete?: () => void;
};

export function TaskDetail({ task, onDelete }: TaskDetailProps) {
  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [projectId, setProjectId] = useState(task.projectId);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [startAt, setStartAt] = useState(task.startAt);
  const [durationMin, setDurationMin] = useState(task.durationMin);
  const [memo, setMemo] = useState(task.note ?? '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist ?? []);

  const [statusOpen, setStatusOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);

  const project = getProject(projectId);
  const accent = project ? PROJECT_COLOR_HEX[project.color as ProjectColor] : TOKENS.color.projectGray;
  const doneCount = checklist.filter((c) => c.done).length;

  const commitTitle = () => {
    if (titleDraft.trim()) setTitle(titleDraft.trim());
    setEditingTitle(false);
  };

  return (
    <div style={taskDetailStyles.page}>
      <div style={taskDetailStyles.titleBlock}>
        {editingTitle ? (
          <input
            // biome-ignore lint/a11y/noAutofocus: 인라인 편집 시 즉시 포커스 필요
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') setEditingTitle(false);
            }}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              padding: 0,
              outline: 'none',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: TOKENS.color.textPrimary,
              fontFamily: 'inherit',
              borderBottom: `2px solid ${TOKENS.color.primary}`,
            }}
          />
        ) : (
          <button
            type="button"
            style={{
              ...taskDetailStyles.title,
              border: 'none',
              background: 'transparent',
              padding: 0,
              textAlign: 'left',
              cursor: 'text',
              fontFamily: 'inherit',
              width: '100%',
            }}
            onClick={() => {
              setTitleDraft(title);
              setEditingTitle(true);
            }}
          >
            {title}
          </button>
        )}

        <button
          type="button"
          onClick={() => setStatusOpen(true)}
          style={{ ...taskDetailStyles.statusPill, ...STATUS_PILL_VAR[status] }}
        >
          <span style={{ ...taskDetailStyles.statusDot, background: STATUS_DOT_COLOR[status] }} />
          {STATUS_LABEL[status]}
        </button>
      </div>

      <div style={taskDetailStyles.card}>
        <button type="button" style={taskDetailStyles.metaRow} onClick={() => setProjOpen(true)}>
          <span style={taskDetailStyles.metaKey}>프로젝트</span>
          <span style={taskDetailStyles.metaVal}>
            {project ? (
              <>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: accent }} />
                {project.name}
              </>
            ) : (
              '선택'
            )}
            <IconChevronRight size={16} stroke={TOKENS.color.textPlaceholder} />
          </span>
        </button>
        <div style={{ ...taskDetailStyles.metaRow, ...taskDetailStyles.metaRowDivider, cursor: 'default' }}>
          <span style={taskDetailStyles.metaKey}>날짜</span>
          <span style={taskDetailStyles.metaVal}>{TODAY_LABEL}</span>
        </div>
        <button
          type="button"
          style={{ ...taskDetailStyles.metaRow, ...taskDetailStyles.metaRowDivider }}
          onClick={() => setSchedOpen(true)}
        >
          <span style={taskDetailStyles.metaKey}>시간</span>
          <span style={taskDetailStyles.metaVal}>
            <span style={{ fontFeatureSettings: '"tnum" 1' }}>
              {startAt} – {endTime(startAt, durationMin)}
            </span>
            <span style={taskDetailStyles.metaHint}>{formatDuration(durationMin)}</span>
            <IconChevronRight size={16} stroke={TOKENS.color.textPlaceholder} />
          </span>
        </button>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <header style={taskDetailStyles.sectionRow}>
          <span style={taskDetailStyles.sectionLabel}>체크리스트</span>
          <span style={taskDetailStyles.sectionMeta}>
            {doneCount} / {checklist.length}
          </span>
        </header>
        <div style={taskDetailStyles.card}>
          {checklist.map((item, idx) => (
            <div
              key={item.id}
              style={{
                ...taskDetailStyles.checkItem,
                borderTop: idx === 0 ? 'none' : `1px solid ${TOKENS.color.divider}`,
              }}
            >
              <button
                type="button"
                aria-pressed={item.done}
                onClick={() => setChecklist((prev) => prev.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)))}
                style={{ ...taskDetailStyles.checkBox, ...(item.done ? taskDetailStyles.checkBoxDone : {}) }}
              >
                {item.done ? <IconCheck size={13} strokeWidth={3.2} /> : null}
              </button>
              <input
                value={item.label}
                onChange={(e) =>
                  setChecklist((prev) => prev.map((c) => (c.id === item.id ? { ...c, label: e.target.value } : c)))
                }
                placeholder="새 항목"
                style={{ ...taskDetailStyles.checkInput, ...(item.done ? taskDetailStyles.checkInputDone : {}) }}
              />
              <button
                type="button"
                aria-label="삭제"
                onClick={() => setChecklist((prev) => prev.filter((c) => c.id !== item.id))}
                style={{
                  width: 28,
                  height: 28,
                  border: 'none',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  color: TOKENS.color.textPlaceholder,
                  cursor: 'pointer',
                  flex: '0 0 auto',
                }}
              >
                <IconX size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            style={taskDetailStyles.addRow}
            onClick={() => setChecklist((prev) => [...prev, { id: `c-${Date.now()}`, label: '', done: false }])}
          >
            <IconPlus size={16} strokeWidth={2.4} />
            항목 추가
          </button>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <header style={taskDetailStyles.sectionRow}>
          <span style={taskDetailStyles.sectionLabel}>메모</span>
        </header>
        <div style={{ ...taskDetailStyles.card, ...taskDetailStyles.memoCard }}>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="이 태스크에 대한 생각을 적어보세요"
            style={taskDetailStyles.memoInput}
          />
        </div>
      </section>

      <button type="button" style={taskDetailStyles.deleteBtn} onClick={() => onDelete?.()}>
        <IconTrash size={14} stroke={TOKENS.color.danger} style={{ marginRight: 6, verticalAlign: -2 }} />이 태스크 삭제
      </button>

      <BottomSheet open={statusOpen} onClose={() => setStatusOpen(false)} title="상태 변경">
        <div style={taskDetailStyles.optList}>
          {(['todo', 'doing', 'done'] as TaskStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              style={taskDetailStyles.optRow}
              onClick={() => {
                setStatus(s);
                setStatusOpen(false);
              }}
            >
              <span style={{ ...taskDetailStyles.optDot, background: STATUS_DOT_COLOR[s] }} />
              <span style={taskDetailStyles.optLabel}>{STATUS_LABEL[s]}</span>
              {status === s ? <IconCheck size={20} strokeWidth={2.6} stroke={TOKENS.color.primary} /> : null}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={projOpen} onClose={() => setProjOpen(false)} title="프로젝트 변경">
        <div style={taskDetailStyles.optList}>
          {PROJECTS.map((p) => (
            <button
              key={p.id}
              type="button"
              style={taskDetailStyles.optRow}
              onClick={() => {
                setProjectId(p.id);
                setProjOpen(false);
              }}
            >
              <span style={{ ...taskDetailStyles.optDot, background: PROJECT_COLOR_HEX[p.color as ProjectColor] }} />
              <span style={taskDetailStyles.optLabel}>{p.name}</span>
              {projectId === p.id ? <IconCheck size={20} strokeWidth={2.6} stroke={TOKENS.color.primary} /> : null}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={schedOpen} onClose={() => setSchedOpen(false)} title="일정 변경">
        <SchedulePicker
          startAt={startAt}
          durationMin={durationMin}
          onApply={(s, d) => {
            setStartAt(s);
            setDurationMin(d);
            setSchedOpen(false);
          }}
        />
      </BottomSheet>
    </div>
  );
}

type SchedulePickerProps = {
  startAt: string;
  durationMin: number;
  onApply: (startAt: string, durationMin: number) => void;
};

export function SchedulePicker({ startAt, durationMin, onApply }: SchedulePickerProps) {
  const [s, setS] = useState(startAt);
  const [d, setD] = useState(durationMin);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={taskDetailStyles.field}>
        <span style={taskDetailStyles.fieldLabel}>시작 시각</span>
        <input type="time" value={s} step={900} onChange={(e) => setS(e.target.value)} style={taskDetailStyles.timeInput} />
      </div>
      <div style={taskDetailStyles.field}>
        <span style={taskDetailStyles.fieldLabel}>기간</span>
        <div style={taskDetailStyles.pillRow}>
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setD(opt)}
              style={{ ...taskDetailStyles.pill, ...(d === opt ? taskDetailStyles.pillActive : {}) }}
            >
              {formatDuration(opt)}
            </button>
          ))}
        </div>
      </div>
      <button type="button" style={taskDetailStyles.primaryBtn} onClick={() => onApply(s, d)}>
        변경 적용
      </button>
    </div>
  );
}
