import { type CSSProperties, useState } from 'react';
import { type Project, tasksByProject } from '@/lib/data';
import { PROJECT_COLOR_HEX, type ProjectColor, TOKENS } from '@/lib/tokens';

export const projStyles: Record<string, CSSProperties> = {
  intro: { padding: '8px 24px 16px' },
  introTitle: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    margin: 0,
    color: TOKENS.color.textPrimary,
  },
  introSub: { fontSize: 14, color: TOKENS.color.textTertiary, marginTop: 6, fontWeight: 500 },
  list: {
    listStyle: 'none',
    padding: '0 16px 24px',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    position: 'relative',
    background: TOKENS.color.surface,
    borderRadius: 18,
    padding: '18px 20px',
    boxShadow: TOKENS.shadow.card,
    cursor: 'pointer',
    transition: 'transform 120ms ease',
    border: 'none',
    textAlign: 'left',
    width: '100%',
    fontFamily: 'inherit',
  },
  head: { display: 'flex', alignItems: 'center', gap: 8 },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: TOKENS.color.textPrimary,
  },
  desc: {
    fontSize: 13,
    color: TOKENS.color.textTertiary,
    margin: '4px 0 14px',
    lineHeight: 1.45,
    fontWeight: 500,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    background: TOKENS.color.surfaceSoft,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },

  detailHero: {
    margin: '4px 16px 16px',
    padding: '20px 22px 22px',
    borderRadius: 20,
    background: TOKENS.color.surface,
    boxShadow: TOKENS.shadow.card,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  detailTopRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    margin: 0,
    lineHeight: 1.15,
    color: TOKENS.color.textPrimary,
  },
  detailDesc: { fontSize: 13, color: TOKENS.color.textTertiary, fontWeight: 500, marginTop: 6 },

  segment: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    background: TOKENS.color.surfaceSoft,
    margin: '0 16px 16px',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    height: 36,
    border: 'none',
    background: 'transparent',
    borderRadius: 9,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    color: TOKENS.color.textTertiary,
    transition: 'all 160ms ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segBtnActive: {
    background: TOKENS.color.surface,
    color: TOKENS.color.textPrimary,
    boxShadow: '0 1px 3px rgba(15, 19, 36, 0.06)',
    fontWeight: 700,
  },
  kanbanList: {
    listStyle: 'none',
    margin: 0,
    padding: '0 16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: TOKENS.color.surface,
    borderRadius: 14,
    boxShadow: TOKENS.shadow.sm,
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    fontFamily: 'inherit',
    textAlign: 'left',
  },
  emptySection: {
    padding: '24px 16px',
    textAlign: 'center',
    color: TOKENS.color.textPlaceholder,
    fontSize: 13,
    fontWeight: 500,
    background: TOKENS.color.surface,
    borderRadius: 14,
    margin: '0 16px',
  },
};

type ProjectsListProps = {
  projects: Project[];
  onOpenProject: (id: string) => void;
};

export function ProjectsList({ projects, onOpenProject }: ProjectsListProps) {
  return (
    <div>
      <header style={projStyles.intro}>
        <h1 style={projStyles.introTitle}>프로젝트</h1>
        <p style={projStyles.introSub}>한 곳에서 모아보기</p>
      </header>
      <ul style={projStyles.list}>
        {projects.map((p) => {
          const accent = PROJECT_COLOR_HEX[p.color as ProjectColor];
          const ratio = p.totalCount ? p.doneCount / p.totalCount : 0;
          const todayCount = tasksByProject(p.id).length;
          return (
            <li key={p.id}>
              <button type="button" style={projStyles.card} onClick={() => onOpenProject(p.id)}>
                <div style={projStyles.head}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: accent, flexShrink: 0 }} />
                    <span style={projStyles.name}>{p.name}</span>
                  </div>
                </div>
                <p style={projStyles.desc}>
                  {p.description}
                  {todayCount > 0 ? ` · 오늘 ${todayCount}개` : ''}
                </p>
                <div style={projStyles.progressTrack}>
                  <div style={{ ...projStyles.progressFill, width: `${ratio * 100}%`, background: TOKENS.color.textPrimary }} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type ProjectDetailProps = { project: Project; onTaskClick?: (id: string) => void };

export function ProjectDetail({ project, onTaskClick }: ProjectDetailProps) {
  const [tab, setTab] = useState<'todo' | 'doing' | 'done'>('todo');
  const accent = PROJECT_COLOR_HEX[project.color as ProjectColor];
  const all = tasksByProject(project.id);

  const cols: { key: 'todo' | 'doing' | 'done'; label: string }[] = [
    { key: 'todo', label: '할 일' },
    { key: 'doing', label: '진행' },
    { key: 'done', label: '완료' },
  ];
  const items = all.filter((t) => t.status === tab);

  return (
    <div>
      <div style={projStyles.detailHero}>
        <div style={projStyles.detailTopRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: TOKENS.color.textTertiary,
                marginBottom: 8,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: accent }} />
              프로젝트
            </div>
            <h1 style={projStyles.detailTitle}>{project.name}</h1>
            <div style={projStyles.detailDesc}>{project.description}</div>
          </div>
        </div>
      </div>

      <div style={projStyles.segment}>
        {cols.map((c) => {
          const active = tab === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setTab(c.key)}
              style={{ ...projStyles.segBtn, ...(active ? projStyles.segBtnActive : {}) }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div style={projStyles.emptySection}>비어 있음</div>
      ) : (
        <ul style={projStyles.kanbanList}>
          {items.map((task) => {
            const isDone = task.status === 'done';
            return (
              <li key={task.id}>
                <button type="button" style={projStyles.taskRow} onClick={() => onTaskClick?.(task.id)}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      flexShrink: 0,
                      background: isDone ? TOKENS.color.borderStrong : accent,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: 600,
                      color: isDone ? TOKENS.color.textTertiary : TOKENS.color.textPrimary,
                      textDecoration: isDone ? 'line-through' : 'none',
                      textDecorationColor: TOKENS.color.borderStrong,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.title}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: TOKENS.color.textTertiary,
                      fontWeight: 600,
                      fontFeatureSettings: '"tnum" 1',
                    }}
                  >
                    {task.startAt}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
