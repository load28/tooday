import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { Check, ChevronRight, Plus, X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { BottomSheet } from '@/components/bottom-sheet';
import { MobileShell, TopBar } from '@/components/mobile-shell';
import {
  endTime,
  formatDuration,
  getProject,
  getTask,
  PROJECT_COLOR_HEX,
  projects,
  type TaskStatus,
  TODAY_LABEL,
} from '@/data/mock';
import * as styles from './tasks.$taskId.css';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '할 일',
  doing: '진행 중',
  done: '완료',
};
const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'done'];

type ChecklistItem = { id: string; label: string; done: boolean };

export const Route = createFileRoute('/_app/tasks/$taskId')({
  component: TaskDetail,
});

function TaskDetail() {
  const { taskId } = Route.useParams();
  const original = getTask(taskId);
  if (!original) throw notFound();

  const navigate = useNavigate();

  const [title, setTitle] = useState(original.title);
  const [projectId, setProjectId] = useState(original.projectId);
  const [status, setStatus] = useState<TaskStatus>(original.status);
  const [startAt, setStartAt] = useState(original.startAt);
  const [durationMin, setDurationMin] = useState(original.durationMin);
  const [memo, setMemo] = useState(original.note ?? '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(original.checklist ?? []);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);

  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);

  const project = getProject(projectId);
  const accent = project ? PROJECT_COLOR_HEX[project.color] : '#8b95a1';

  const startEditTitle = () => {
    setTitleDraft(title);
    setEditingTitle(true);
  };
  const commitTitle = () => {
    const next = titleDraft.trim();
    if (next) setTitle(next);
    setEditingTitle(false);
  };
  const onTitleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTitle();
    } else if (e.key === 'Escape') {
      setEditingTitle(false);
    }
  };

  const toggleCheck = (id: string) => setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  const editLabel = (id: string, label: string) => setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  const removeCheck = (id: string) => setChecklist((prev) => prev.filter((c) => c.id !== id));
  const addCheck = () => setChecklist((prev) => [...prev, { id: `c-${Date.now()}`, label: '', done: false }]);

  const handleDelete = () => {
    if (typeof window === 'undefined') return;
    if (window.confirm('이 태스크를 삭제할까요?')) {
      navigate({ to: '/' });
    }
  };

  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <MobileShell topBar={<TopBar title="태스크" showBack />} showFab={false}>
      <div className={styles.root}>
        <div className={styles.titleBlock}>
          {editingTitle ? (
            <input
              // biome-ignore lint/a11y/noAutofocus: 인라인 편집 진입 시 즉시 포커스 필요
              autoFocus
              className={styles.titleInput}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={onTitleKey}
              aria-label="태스크 제목"
            />
          ) : (
            <button type="button" className={styles.titleBtn} onClick={startEditTitle}>
              {title}
            </button>
          )}

          <button
            type="button"
            className={`${styles.statusPill} ${styles.statusPillVariants[status]}`}
            onClick={() => setStatusSheetOpen(true)}
          >
            <span className={`${styles.statusDot} ${styles.statusDotVariants[status]}`} />
            {STATUS_LABEL[status]}
          </button>
        </div>

        <ul className={styles.metaList}>
          <li>
            <button type="button" className={`${styles.metaRow} ${styles.metaRowBtn}`} onClick={() => setProjectSheetOpen(true)}>
              <span className={styles.metaKey}>프로젝트</span>
              <span className={styles.metaValue}>
                {project ? (
                  <>
                    <span className={styles.metaProjectDot} style={{ background: accent }} />
                    {project.name}
                  </>
                ) : (
                  '선택'
                )}
                <ChevronRight size={16} className={styles.metaChev} />
              </span>
            </button>
          </li>
          <li>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>날짜</span>
              <span className={styles.metaValue}>{TODAY_LABEL}</span>
            </div>
          </li>
          <li>
            <button type="button" className={`${styles.metaRow} ${styles.metaRowBtn}`} onClick={() => setScheduleSheetOpen(true)}>
              <span className={styles.metaKey}>시간</span>
              <span className={styles.metaValue}>
                {startAt} – {endTime(startAt, durationMin)}
                <span className={styles.metaHint}>{formatDuration(durationMin)}</span>
                <ChevronRight size={16} className={styles.metaChev} />
              </span>
            </button>
          </li>
        </ul>

        <section className={styles.sectionBlock}>
          <header className={styles.sectionTitleRow}>
            <h2 className={styles.sectionTitle}>체크리스트</h2>
            <span className={styles.sectionMeta}>
              {doneCount} / {checklist.length}
            </span>
          </header>
          <ul className={styles.checklist}>
            {checklist.map((item) => (
              <li key={item.id} className={styles.checkItem}>
                <button
                  type="button"
                  aria-pressed={item.done}
                  className={`${styles.checkBoxBase} ${item.done ? styles.checkBoxDone : styles.checkBoxTodo}`}
                  onClick={() => toggleCheck(item.id)}
                >
                  {item.done ? <Check size={14} strokeWidth={3} /> : null}
                </button>
                <input
                  className={`${styles.checkInput} ${item.done ? styles.checkInputDone : ''}`}
                  value={item.label}
                  onChange={(e) => editLabel(item.id, e.target.value)}
                  placeholder="새 항목"
                />
                <button type="button" aria-label="항목 삭제" className={styles.checkRemove} onClick={() => removeCheck(item.id)}>
                  <X size={16} />
                </button>
              </li>
            ))}
            <li>
              <button type="button" className={styles.addRow} onClick={addCheck}>
                <Plus size={16} />
                항목 추가
              </button>
            </li>
          </ul>
        </section>

        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>메모</h2>
          <textarea
            className={styles.memoInput}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="이 태스크에 대한 생각을 적어보세요"
          />
        </section>

        <button type="button" className={styles.deleteRow} onClick={handleDelete}>
          이 태스크 삭제
        </button>
      </div>

      <BottomSheet open={statusSheetOpen} onClose={() => setStatusSheetOpen(false)} title="상태 변경">
        <ul className={styles.optionList}>
          {STATUS_ORDER.map((s) => {
            const active = status === s;
            return (
              <li key={s}>
                <button
                  type="button"
                  className={styles.optionRow}
                  onClick={() => {
                    setStatus(s);
                    setStatusSheetOpen(false);
                  }}
                >
                  <span className={`${styles.statusDot} ${styles.statusDotVariants[s]}`} />
                  <span className={styles.optionLabel}>{STATUS_LABEL[s]}</span>
                  {active ? <Check size={20} strokeWidth={2.5} color="#3182f6" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      <BottomSheet open={projectSheetOpen} onClose={() => setProjectSheetOpen(false)} title="프로젝트 변경">
        <ul className={styles.optionList}>
          {projects.map((p) => {
            const active = p.id === projectId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={styles.optionRow}
                  onClick={() => {
                    setProjectId(p.id);
                    setProjectSheetOpen(false);
                  }}
                >
                  <span className={styles.optionDot} style={{ background: PROJECT_COLOR_HEX[p.color] }} />
                  <span className={styles.optionLabel}>{p.name}</span>
                  {active ? <Check size={20} strokeWidth={2.5} color="#3182f6" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      <BottomSheet open={scheduleSheetOpen} onClose={() => setScheduleSheetOpen(false)} title="일정 변경">
        <SchedulePickerBody
          startAt={startAt}
          durationMin={durationMin}
          onApply={(s, d) => {
            setStartAt(s);
            setDurationMin(d);
            setScheduleSheetOpen(false);
          }}
        />
      </BottomSheet>
    </MobileShell>
  );
}

function SchedulePickerBody({
  startAt,
  durationMin,
  onApply,
}: {
  startAt: string;
  durationMin: number;
  onApply: (startAt: string, durationMin: number) => void;
}) {
  const [draftStart, setDraftStart] = useState(startAt);
  const [draftDuration, setDraftDuration] = useState(durationMin);

  return (
    <div className={styles.formStack}>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>시작 시각</span>
        <input
          type="time"
          value={draftStart}
          onChange={(e) => setDraftStart(e.target.value)}
          step={900}
          className={styles.fieldInput}
        />
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>기간</span>
        <div className={styles.pillRow}>
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={`${styles.pill} ${draftDuration === d ? styles.pillActive : ''}`}
              onClick={() => setDraftDuration(d)}
            >
              {formatDuration(d)}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className={styles.primaryBtn} onClick={() => onApply(draftStart, draftDuration)}>
        변경 적용
      </button>
    </div>
  );
}
