import type { CSSProperties } from 'react';
import { IconCalendarOff, IconCheck, IconLoader } from '@/components/icons';
import { type Day, formatDuration, getProject, type Task, timeToMin } from '@/lib/data';
import { PROJECT_COLOR_HEX, PROJECT_COLOR_SOFT, type ProjectColor, TOKENS } from '@/lib/tokens';

export const dayStyles: Record<string, CSSProperties> = {
  page: { padding: '0 0 32px' },
  hero: {
    margin: '4px 16px 16px',
    padding: '20px 22px 22px',
    borderRadius: 20,
    background: TOKENS.color.surface,
    boxShadow: TOKENS.shadow.card,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  heroTopRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroDate: { fontSize: 13, fontWeight: 700, color: TOKENS.color.primary, letterSpacing: '-0.01em' },
  heroTitle: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
    margin: 0,
    color: TOKENS.color.textPrimary,
    whiteSpace: 'nowrap',
  },

  weekStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
    padding: '8px 12px 16px',
  },
  weekCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 0 6px',
    borderRadius: 14,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: TOKENS.color.textTertiary,
    transition: 'background 160ms ease, color 160ms ease',
  },
  weekDow: { fontSize: 11, fontWeight: 600, marginBottom: 4 },
  weekDay: { fontSize: 16, fontWeight: 700, fontFeatureSettings: '"tnum" 1' },
  weekDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    background: TOKENS.color.borderStrong,
    marginTop: 4,
  },

  sectionHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: '8px 24px 8px',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: TOKENS.color.textTertiary,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },

  timeline: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  row: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr',
    gap: 12,
    alignItems: 'stretch',
    position: 'relative',
  },
  timeCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    paddingTop: 14,
    position: 'relative',
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: TOKENS.color.textSecondary,
    fontFeatureSettings: '"tnum" 1',
    letterSpacing: '-0.01em',
  },
  timeDuration: { fontSize: 11, color: TOKENS.color.textPlaceholder, fontWeight: 500, marginTop: 2 },

  card: {
    position: 'relative',
    background: TOKENS.color.surface,
    borderRadius: 16,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    boxShadow: TOKENS.shadow.card,
    cursor: 'pointer',
    transition: 'transform 120ms ease, box-shadow 120ms ease',
    overflow: 'hidden',
  },
  cardActive: {
    background: TOKENS.color.surface,
    boxShadow: `0 0 0 2px ${TOKENS.color.primary}, ${TOKENS.shadow.card}`,
  },
  cardBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  cardHeadRow: { display: 'flex', alignItems: 'center', gap: 8 },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: TOKENS.color.textPrimary,
    margin: 0,
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardTitleDone: {
    color: TOKENS.color.textTertiary,
    textDecoration: 'line-through',
    textDecorationColor: TOKENS.color.borderStrong,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: TOKENS.color.textTertiary,
    fontWeight: 500,
  },
  cardChipDot: { width: 6, height: 6, borderRadius: 999, flexShrink: 0 },
  cardProjectInline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: TOKENS.color.textTertiary,
  },
  cardCheck: {
    width: 24,
    height: 24,
    borderRadius: 8,
    border: `1.5px solid ${TOKENS.color.borderStrong}`,
    background: TOKENS.color.surface,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 160ms ease',
  },
  cardCheckDone: {
    background: TOKENS.color.success,
    borderColor: TOKENS.color.success,
    color: '#fff',
  },
  cardCheckDoing: {
    background: TOKENS.color.primarySoft,
    borderColor: TOKENS.color.primary,
    color: TOKENS.color.primary,
  },
  empty: {
    padding: '60px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
    color: TOKENS.color.textTertiary,
  },
};

type RingProps = {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
};

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  color = TOKENS.color.primary,
  track = TOKENS.color.surfaceSoft,
  label,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - value * c;
  return (
    <div
      role="img"
      aria-label={`진행률 ${Math.round(value * 100)}%`}
      style={{ width: size, height: size, position: 'relative', flex: '0 0 auto' }}
    >
      <svg
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        style={{ display: 'block', transform: 'rotate(-90deg)' }}
      >
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 480ms ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size > 50 ? 16 : 12,
          fontWeight: 700,
          color: TOKENS.color.textPrimary,
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {label ?? `${Math.round(value * 100)}`}
      </div>
    </div>
  );
}

type WeekStripProps = { days: Day[]; activeIdx: number; onSelect: (i: number) => void };

export function WeekStrip({ days, activeIdx, onSelect }: WeekStripProps) {
  return (
    <div style={dayStyles.weekStrip}>
      {days.map((d, i) => {
        const isActive = i === activeIdx;
        const isToday = d.isToday;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onSelect(i)}
            style={{
              ...dayStyles.weekCell,
              ...(isActive
                ? { background: TOKENS.color.primary, color: '#fff' }
                : isToday
                  ? { color: TOKENS.color.primary }
                  : {}),
            }}
          >
            <span style={{ ...dayStyles.weekDow, opacity: isActive ? 0.85 : 1 }}>{d.dow}</span>
            <span style={dayStyles.weekDay}>{d.day}</span>
            <span
              style={{
                ...dayStyles.weekDot,
                background: isActive ? 'rgba(255,255,255,0.6)' : d.hasTasks ? TOKENS.color.primary : 'transparent',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

type TaskCardProps = {
  task: Task;
  onToggle?: (id: string) => void;
  onClick?: () => void;
};

export function TaskCard({ task, onToggle, onClick }: TaskCardProps) {
  const project = getProject(task.projectId);
  const accent = project ? PROJECT_COLOR_HEX[project.color as ProjectColor] : TOKENS.color.projectGray;
  const isDone = task.status === 'done';
  const isDoing = task.status === 'doing';

  return (
    <div style={{ ...dayStyles.card, ...(isDoing ? dayStyles.cardActive : {}) }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: 0,
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          fontFamily: 'inherit',
          cursor: 'pointer',
          color: 'inherit',
        }}
      >
        <div style={dayStyles.cardHeadRow}>
          <h3 style={{ ...dayStyles.cardTitle, ...(isDone ? dayStyles.cardTitleDone : {}) }}>{task.title}</h3>
        </div>
        <div style={dayStyles.cardMeta}>
          <span style={dayStyles.cardProjectInline}>
            <span style={{ ...dayStyles.cardChipDot, background: accent }} />
            {project?.name ?? '—'}
          </span>
        </div>
      </button>
      <button
        type="button"
        aria-label="완료 토글"
        onClick={() => onToggle?.(task.id)}
        style={{ ...dayStyles.cardCheck, ...(isDone ? dayStyles.cardCheckDone : isDoing ? dayStyles.cardCheckDoing : {}) }}
      >
        {isDone ? <IconCheck size={14} strokeWidth={3} /> : isDoing ? <IconLoader size={14} strokeWidth={2.4} /> : null}
      </button>
    </div>
  );
}

const SECTION_LABEL: Record<'morning' | 'afternoon' | 'evening', string> = {
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
};
const SECTION_ORDER: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];

function sectionOf(time: string): 'morning' | 'afternoon' | 'evening' {
  const h = parseInt(time.split(':')[0] ?? '0', 10);
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

type DayViewProps = {
  tasks: Task[];
  onTaskClick?: (id: string) => void;
  onToggleTask?: (id: string) => void;
  day: Day;
  days: Day[];
  activeDayIdx: number;
  onSelectDay: (i: number) => void;
};

export function DayView({ tasks, onTaskClick, onToggleTask, day, days, activeDayIdx, onSelectDay }: DayViewProps) {
  const sortedTasks = [...tasks].sort((a, b) => timeToMin(a.startAt) - timeToMin(b.startAt));
  const totalCount = sortedTasks.length;
  const doneCount = sortedTasks.filter((t) => t.status === 'done').length;

  const grouped = SECTION_ORDER.reduce<Record<'morning' | 'afternoon' | 'evening', Task[]>>(
    (acc, k) => {
      acc[k] = sortedTasks.filter((t) => sectionOf(t.startAt) === k);
      return acc;
    },
    { morning: [], afternoon: [], evening: [] },
  );

  // Suppress unused warning for PROJECT_COLOR_SOFT export
  void PROJECT_COLOR_SOFT;

  return (
    <div style={dayStyles.page}>
      <div style={dayStyles.hero}>
        <div style={dayStyles.heroTopRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={dayStyles.heroDate}>오늘 · {day.label}</div>
            <h1 style={{ ...dayStyles.heroTitle, marginTop: 4 }}>
              할 일 <span style={{ color: TOKENS.color.primary }}>{totalCount - doneCount}개</span>
              <span style={{ color: TOKENS.color.textTertiary, fontWeight: 700 }}> 남았어요</span>
            </h1>
          </div>
        </div>
      </div>

      <WeekStrip days={days} activeIdx={activeDayIdx} onSelect={onSelectDay} />

      {totalCount === 0 ? (
        <div style={dayStyles.empty}>
          <IconCalendarOff size={36} stroke={TOKENS.color.borderStrong} />
          <div style={{ fontSize: 16, fontWeight: 700, color: TOKENS.color.textSecondary }}>이 날에는 일정이 없어요</div>
          <div style={{ fontSize: 13 }}>새 태스크를 추가해 하루를 계획해 보세요</div>
        </div>
      ) : null}

      {SECTION_ORDER.map((key) => {
        const items = grouped[key];
        if (!items.length) return null;
        return (
          <section key={key} style={{ marginTop: 6 }}>
            <header style={dayStyles.sectionHead}>
              <span style={dayStyles.sectionTitle}>{SECTION_LABEL[key]}</span>
            </header>
            <div style={dayStyles.timeline}>
              {items.map((task) => (
                <div key={task.id} style={dayStyles.row}>
                  <div style={dayStyles.timeCol}>
                    <span style={dayStyles.timeLabel}>{task.startAt}</span>
                    <span style={dayStyles.timeDuration}>{formatDuration(task.durationMin)}</span>
                  </div>
                  <TaskCard task={task} onToggle={onToggleTask} onClick={() => onTaskClick?.(task.id)} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
