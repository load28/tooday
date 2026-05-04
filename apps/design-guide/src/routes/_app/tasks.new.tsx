import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { card } from '@/components/atoms.css';
import { BottomSheet } from '@/components/bottom-sheet';
import { MobileShell, TopBar } from '@/components/mobile-shell';
import { endTime, formatDuration, getProject, PROJECT_COLOR_HEX, projects } from '@/data/mock';
import * as styles from './tasks.new.css';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export const Route = createFileRoute('/_app/tasks/new')({
  component: NewTask,
});

function NewTask() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? '');
  const [startAt, setStartAt] = useState('09:00');
  const [durationMin, setDurationMin] = useState(30);
  const [memo, setMemo] = useState('');

  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);

  const project = getProject(projectId);
  const accent = project ? PROJECT_COLOR_HEX[project.color] : '#8b95a1';

  const canCreate = title.trim().length > 0;
  const create = () => {
    if (!canCreate) return;
    navigate({ to: '/' });
  };

  return (
    <MobileShell topBar={<TopBar title="새 태스크" showBack />} showFab={false} showTabBar={false}>
      <div className={styles.form}>
        <input
          // biome-ignore lint/a11y/noAutofocus: 새 태스크 화면 진입 시 즉시 입력 시작
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="무엇을 할까요?"
          className={styles.titleInput}
          aria-label="태스크 제목"
        />

        <ul className={`${card} ${styles.fieldList}`}>
          <li>
            <button type="button" className={styles.fieldRow} onClick={() => setProjectSheetOpen(true)}>
              <span className={styles.fieldLabel}>프로젝트</span>
              <span className={styles.fieldValue}>
                <span className={styles.dot} style={{ background: accent }} />
                {project?.name ?? '선택'}
                <ChevronRight size={16} className={styles.chevron} />
              </span>
            </button>
          </li>
          <li>
            <button type="button" className={styles.fieldRow} onClick={() => setScheduleSheetOpen(true)}>
              <span className={styles.fieldLabel}>시간</span>
              <span className={styles.fieldValue}>
                {startAt} – {endTime(startAt, durationMin)}
                <span className={styles.fieldHint}>{formatDuration(durationMin)}</span>
                <ChevronRight size={16} className={styles.chevron} />
              </span>
            </button>
          </li>
        </ul>

        <div className={styles.memoBlock}>
          <span className={styles.sectionLabel}>메모</span>
          <div className={`${card} ${styles.memoCard}`}>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="필요하면 적어보세요"
              className={styles.memoInput}
            />
          </div>
        </div>

        <button type="button" className={styles.primaryBtn} disabled={!canCreate} onClick={create}>
          만들기
        </button>
      </div>

      <BottomSheet open={projectSheetOpen} onClose={() => setProjectSheetOpen(false)} title="프로젝트 선택">
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

      <BottomSheet open={scheduleSheetOpen} onClose={() => setScheduleSheetOpen(false)} title="시간 설정">
        <div className={styles.formStack}>
          <div className={styles.field}>
            <span className={styles.fieldSheetLabel}>시작 시각</span>
            <input
              type="time"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              step={900}
              className={styles.sheetInput}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldSheetLabel}>기간</span>
            <div className={styles.pillRow}>
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`${styles.pill} ${durationMin === d ? styles.pillActive : ''}`}
                  onClick={() => setDurationMin(d)}
                >
                  {formatDuration(d)}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className={styles.primaryBtn} onClick={() => setScheduleSheetOpen(false)}>
            완료
          </button>
        </div>
      </BottomSheet>
    </MobileShell>
  );
}
