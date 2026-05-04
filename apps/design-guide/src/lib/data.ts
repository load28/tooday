import type { ProjectColor } from './tokens';

export type TaskStatus = 'todo' | 'doing' | 'done';
export type ChecklistItem = { id: string; label: string; done: boolean };

export type Project = {
  id: string;
  name: string;
  color: ProjectColor;
  description: string;
  totalCount: number;
  doneCount: number;
};

export type Task = {
  id: string;
  title: string;
  projectId: string;
  startAt: string;
  durationMin: number;
  status: TaskStatus;
  note?: string;
  checklist?: ChecklistItem[];
};

export const PROJECTS: Project[] = [
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
  { id: 'p-life', name: '일상', color: 'mint', description: '운동 · 독서 · 산책', totalCount: 5, doneCount: 2 },
  { id: 'p-study', name: '공부', color: 'amber', description: 'Rust 타입 시스템', totalCount: 6, doneCount: 1 },
];

export const TASKS: Task[] = [
  { id: 't-1', title: '아침 스트레칭', projectId: 'p-life', startAt: '07:30', durationMin: 30, status: 'done' },
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
  { id: 't-4', title: '점심 · 산책', projectId: 'p-life', startAt: '12:00', durationMin: 60, status: 'todo' },
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
  { id: 't-6', title: 'Rust 타입 챕터 3 읽기', projectId: 'p-study', startAt: '16:00', durationMin: 60, status: 'todo' },
  { id: 't-7', title: '회고 한 줄 쓰기', projectId: 'p-tooday', startAt: '21:30', durationMin: 15, status: 'todo' },
];

export const TODAY_LABEL = '5월 3일 토요일';

export type Day = { key: string; label: string; dow: string; day: number; isToday: boolean; hasTasks: boolean };

export const DAYS: Day[] = [
  { key: 'd-1', label: '5월 1일 목요일', dow: '목', day: 1, isToday: false, hasTasks: false },
  { key: 'd-2', label: '5월 2일 금요일', dow: '금', day: 2, isToday: false, hasTasks: true },
  { key: 'd-3', label: '5월 3일 토요일', dow: '토', day: 3, isToday: true, hasTasks: true },
  { key: 'd-4', label: '5월 4일 일요일', dow: '일', day: 4, isToday: false, hasTasks: false },
  { key: 'd-5', label: '5월 5일 월요일', dow: '월', day: 5, isToday: false, hasTasks: true },
  { key: 'd-6', label: '5월 6일 화요일', dow: '화', day: 6, isToday: false, hasTasks: true },
  { key: 'd-7', label: '5월 7일 수요일', dow: '수', day: 7, isToday: false, hasTasks: false },
];

export const TODAY_INDEX = 2;

export function getProject(id: string) {
  return PROJECTS.find((p) => p.id === id);
}
export function getTask(id: string) {
  return TASKS.find((t) => t.id === id);
}
export function tasksByProject(pid: string) {
  return TASKS.filter((t) => t.projectId === pid);
}
export function formatDuration(min: number) {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}
export function endTime(startAt: string, durationMin: number) {
  const [h = 0, m = 0] = startAt.split(':').map(Number);
  const total = h * 60 + m + durationMin;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}
export function timeToMin(t: string) {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
}
