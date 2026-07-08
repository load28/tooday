import type { Task, TaskPatch } from '@tooday/shared';

/** patch에서 값이 지정된 필드만 (undefined 스프레드로 기존 값을 지우지 않게) */
function definedFields(patch: TaskPatch): Partial<Task> {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<Task>;
}

/**
 * 낙관적 캐시 패치용 — 서버가 할 일(지정 필드 적용 + version 증가)을 캐시에 미리 흉내낸다.
 * 서버 결과와의 최종 수렴은 onSettled invalidate가 맡는다 (docs/conventions/web-cache-policy.md).
 */
export function applyTaskPatch(task: Task, patch: TaskPatch): Task {
  return { ...task, ...definedFields(patch), version: task.version + 1 };
}
