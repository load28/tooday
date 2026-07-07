import { useState } from 'react';
import { BottomSheet } from '@/components/bottom-sheet';
import { IconCheck, IconChevronRight, IconPlus } from '@/components/icons';
import { endTime, formatDuration, PROJECTS, type Project } from '@/lib/data';
import { PROJECT_COLOR_HEX, type ProjectColor, TOKENS } from '@/lib/tokens';
import { NewProjectSheet } from './new-project';
import { SchedulePicker, taskDetailStyles } from './task-detail';

type NewTaskProps = {
  onCancel?: () => void;
  onCreate?: () => void;
};

export function NewTask({ onCreate }: NewTaskProps) {
  const [title, setTitle] = useState('');
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [projectId, setProjectId] = useState(PROJECTS[0]?.id ?? '');
  const [startAt, setStartAt] = useState('09:00');
  const [durationMin, setDurationMin] = useState(30);
  const [memo, setMemo] = useState('');
  const [projOpen, setProjOpen] = useState(false);
  const [newProjOpen, setNewProjOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const accent = project ? PROJECT_COLOR_HEX[project.color as ProjectColor] : TOKENS.color.projectGray;
  const canCreate = title.trim().length > 0;

  return (
    <div style={{ padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <input
        // biome-ignore lint/a11y/noAutofocus: 새 태스크 진입 시 즉시 입력 시작
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="무엇을 할까요?"
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          padding: '0 4px',
          outline: 'none',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: TOKENS.color.textPrimary,
          fontFamily: 'inherit',
        }}
      />

      <div style={taskDetailStyles.card}>
        <button type="button" style={taskDetailStyles.metaRow} onClick={() => setProjOpen(true)}>
          <span style={taskDetailStyles.metaKey}>프로젝트</span>
          <span style={taskDetailStyles.metaVal}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: accent }} />
            {project?.name ?? '선택'}
            <IconChevronRight size={16} stroke={TOKENS.color.textPlaceholder} />
          </span>
        </button>
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
        <span style={taskDetailStyles.sectionLabel}>메모</span>
        <div style={{ ...taskDetailStyles.card, ...taskDetailStyles.memoCard }}>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="필요하면 적어보세요"
            style={taskDetailStyles.memoInput}
          />
        </div>
      </section>

      <button
        type="button"
        disabled={!canCreate}
        onClick={() => onCreate?.()}
        style={{
          ...taskDetailStyles.primaryBtn,
          marginTop: 8,
          background: canCreate ? TOKENS.color.primary : TOKENS.color.borderStrong,
          cursor: canCreate ? 'pointer' : 'not-allowed',
        }}
      >
        만들기
      </button>

      <BottomSheet open={projOpen} onClose={() => setProjOpen(false)} title="프로젝트 선택">
        <div style={taskDetailStyles.optList}>
          {projects.map((p) => (
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
          <button
            type="button"
            style={{ ...taskDetailStyles.optRow, borderTop: `1px solid ${TOKENS.color.divider}`, borderRadius: 0 }}
            onClick={() => {
              setProjOpen(false);
              setNewProjOpen(true);
            }}
          >
            <span style={{ width: 12, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <IconPlus size={16} strokeWidth={2.4} stroke={TOKENS.color.primary} />
            </span>
            <span style={{ ...taskDetailStyles.optLabel, color: TOKENS.color.primary }}>새 프로젝트 만들기</span>
          </button>
        </div>
      </BottomSheet>

      <NewProjectSheet
        open={newProjOpen}
        onClose={() => setNewProjOpen(false)}
        onCreate={(p) => {
          setProjects((prev) => [...prev, p]);
          setProjectId(p.id);
          setNewProjOpen(false);
        }}
      />

      <BottomSheet open={schedOpen} onClose={() => setSchedOpen(false)} title="시간 설정">
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
