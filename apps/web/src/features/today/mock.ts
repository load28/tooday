import { token } from 'styled-system/tokens';

// BFF에 tasks 도메인이 생기기 전까지 화면을 조립하는 목데이터.
// 계약(타입·필드)은 apps/design-guide/src/lib/data.ts 프로토타입을 따르며,
// 백엔드가 붙으면 packages/shared 스키마 + tRPC 쿼리로 교체한다.

export type TaskStatus = 'todo' | 'doing' | 'done';
export type ProjectColor = 'blue' | 'mint' | 'violet' | 'amber' | 'pink' | 'gray';

export type Project = {
  id: string;
  name: string;
  color: ProjectColor;
};

export type Task = {
  id: string;
  title: string;
  projectId: string;
  /** 'HH:mm' */
  startAt: string;
  durationMin: number;
  status: TaskStatus;
};

export const PROJECT_COLOR: Record<ProjectColor, string> = {
  blue: token('colors.brand.500'),
  mint: token('colors.mint.500'),
  violet: token('colors.violet.500'),
  amber: token('colors.amber.500'),
  pink: token('colors.rose.500'),
  gray: token('colors.cool.500'),
};

export const MOCK_PROJECTS: Project[] = [
  { id: 'p-tooday', name: 'TooDay 앱', color: 'blue' },
  { id: 'p-design', name: '디자인 시스템', color: 'violet' },
  { id: 'p-life', name: '일상', color: 'mint' },
  { id: 'p-study', name: '공부', color: 'amber' },
];

/** 오늘 기준 날짜 오프셋(일) → 그날의 태스크. 주간 스트립 이동을 시연하기 위해 며칠에 나눠 둔다. */
export const MOCK_TASKS_BY_OFFSET: Record<number, Task[]> = {
  [-1]: [
    { id: 'y-1', title: '주간 회고 정리', projectId: 'p-tooday', startAt: '10:00', durationMin: 60, status: 'done' },
    { id: 'y-2', title: '저녁 러닝', projectId: 'p-life', startAt: '19:00', durationMin: 40, status: 'done' },
  ],
  0: [
    { id: 't-1', title: '아침 스트레칭', projectId: 'p-life', startAt: '07:30', durationMin: 30, status: 'done' },
    {
      id: 't-2',
      title: '일정 정리 & 오늘 우선순위 다듬기',
      projectId: 'p-tooday',
      startAt: '09:00',
      durationMin: 30,
      status: 'done',
    },
    { id: 't-3', title: '디자인 토큰 1차안 정리', projectId: 'p-design', startAt: '10:00', durationMin: 90, status: 'doing' },
    { id: 't-4', title: '점심 · 산책', projectId: 'p-life', startAt: '12:00', durationMin: 60, status: 'todo' },
    { id: 't-5', title: '시간 뷰 프로토타입', projectId: 'p-tooday', startAt: '13:30', durationMin: 120, status: 'todo' },
    { id: 't-6', title: 'Rust 타입 챕터 3 읽기', projectId: 'p-study', startAt: '16:00', durationMin: 60, status: 'todo' },
    { id: 't-7', title: '회고 한 줄 쓰기', projectId: 'p-tooday', startAt: '21:30', durationMin: 15, status: 'todo' },
  ],
  2: [
    { id: 'n-1', title: '컴포넌트 리뷰 미팅', projectId: 'p-design', startAt: '11:00', durationMin: 60, status: 'todo' },
    { id: 'n-2', title: 'Rust 타입 챕터 4 읽기', projectId: 'p-study', startAt: '15:00', durationMin: 60, status: 'todo' },
  ],
};

export function getProject(id: string): Project | undefined {
  return MOCK_PROJECTS.find((p) => p.id === id);
}

export function timeToMin(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}
