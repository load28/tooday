import type { TaskStatus } from '@tooday/shared';

/** 상태 표시 순서 — 보드 세그먼트(projects)·상태 선택 시트(tasks)가 feature 경계 너머로 공용한다 */
export const STATUS_ORDER: readonly TaskStatus[] = ['todo', 'doing', 'done'] as const;

/** 상태 → Dot tone (점 색) */
export const STATUS_DOT_TONE: Record<TaskStatus, 'neutral' | 'primary' | 'success'> = {
  todo: 'neutral',
  doing: 'primary',
  done: 'success',
};

/** 상태 → Chip tone (알약 색) */
export const STATUS_CHIP_TONE: Record<TaskStatus, 'neutral' | 'brand' | 'success'> = {
  todo: 'neutral',
  doing: 'brand',
  done: 'success',
};
