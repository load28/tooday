import { tokens } from '@/styles/theme.css';

export type ProjectColor = 'blue' | 'mint' | 'violet' | 'amber' | 'pink' | 'gray';

export type Project = {
  id: string;
  name: string;
  color: ProjectColor;
  description: string;
  totalCount: number;
  doneCount: number;
};

export type TaskStatus = 'todo' | 'doing' | 'done';

export type Task = {
  id: string;
  title: string;
  projectId: string;
  /** 24h, "HH:mm" — 시작 시각. */
  startAt: string;
  /** 분 단위 길이. */
  durationMin: number;
  status: TaskStatus;
  note?: string;
  checklist?: { id: string; label: string; done: boolean }[];
};

export const PROJECT_COLOR_HEX: Record<ProjectColor, string> = {
  blue: tokens.color.projectBlue,
  mint: tokens.color.projectMint,
  violet: tokens.color.projectViolet,
  amber: tokens.color.projectAmber,
  pink: tokens.color.projectPink,
  gray: tokens.color.projectGray,
};

export const projects: Project[] = [
  {
    id: 'p-tooday',
    name: 'TooDay 앱',
    color: 'blue',
    description: '모바일 웹뷰 칸반 일정 관리 앱',
    totalCount: 12,
    doneCount: 4,
  },
  {
    id: 'p-design',
    name: '디자인 시스템',
    color: 'violet',
    description: 'Toss 스타일 미니멀 컴포넌트 정리',
    totalCount: 8,
    doneCount: 5,
  },
  {
    id: 'p-life',
    name: '일상',
    color: 'mint',
    description: '운동 · 독서 · 산책',
    totalCount: 5,
    doneCount: 2,
  },
  {
    id: 'p-study',
    name: '공부',
    color: 'amber',
    description: 'Rust 타입 시스템',
    totalCount: 6,
    doneCount: 1,
  },
];

export const tasks: Task[] = [
  {
    id: 't-1',
    title: '아침 스트레칭',
    projectId: 'p-life',
    startAt: '07:30',
    durationMin: 30,
    status: 'done',
  },
  {
    id: 't-2',
    title: '일정 정리 & 오늘 우선순위 다듬기',
    projectId: 'p-tooday',
    startAt: '09:00',
    durationMin: 30,
    status: 'done',
    note: '캘린더 동기화 후 상위 3개 태스크 픽',
  },
  {
    id: 't-3',
    title: '디자인 토큰 1차안 정리',
    projectId: 'p-design',
    startAt: '10:00',
    durationMin: 90,
    status: 'doing',
    checklist: [
      { id: 'c-1', label: '컬러 팔레트', done: true },
      { id: 'c-2', label: '타이포 스케일', done: true },
      { id: 'c-3', label: '간격/라운드', done: false },
      { id: 'c-4', label: '쉐도우/모션', done: false },
    ],
    note: '오늘 안에 미니멀 톤으로 1차 마감, 내일 리뷰',
  },
  {
    id: 't-4',
    title: '점심 · 산책',
    projectId: 'p-life',
    startAt: '12:00',
    durationMin: 60,
    status: 'todo',
  },
  {
    id: 't-5',
    title: '시간 뷰 프로토타입',
    projectId: 'p-tooday',
    startAt: '13:30',
    durationMin: 120,
    status: 'todo',
    checklist: [
      { id: 'c-1', label: '데이트 스트립', done: false },
      { id: 'c-2', label: '시간 블록 카드', done: false },
      { id: 'c-3', label: 'FAB & 탭바', done: false },
    ],
  },
  {
    id: 't-6',
    title: 'Rust 타입 챕터 3 읽기',
    projectId: 'p-study',
    startAt: '16:00',
    durationMin: 60,
    status: 'todo',
  },
  {
    id: 't-7',
    title: '회고 한 줄 쓰기',
    projectId: 'p-tooday',
    startAt: '21:30',
    durationMin: 15,
    status: 'todo',
  },
];

export const TODAY_LABEL = '5월 3일 토요일';

export function getProject(id: string) {
  return projects.find((p) => p.id === id);
}

export function getTask(id: string) {
  return tasks.find((t) => t.id === id);
}

export function tasksByProject(projectId: string) {
  return tasks.filter((t) => t.projectId === projectId);
}

export function formatDuration(min: number) {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

export function endTime(startAt: string, durationMin: number) {
  const [h, m] = startAt.split(':').map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + durationMin;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}
