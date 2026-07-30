import type { Task, TaskPatch } from '@tooday/shared';

/** patch에서 undefined를 걷어낸 필드 집합 — 계약(TaskPatch)에서 필드별 타입을 그대로 파생한다 (projectId의 `| null` 보존) */
type DefinedFields = { [K in keyof TaskPatch]?: Exclude<TaskPatch[K], undefined> };

/**
 * patch에서 값이 지정된 필드만 (undefined 스프레드로 기존 값을 지우지 않게, null은 보존).
 *
 * 조건부 스프레드로 필드별 타입을 그대로 흘려보낸다 — 각 조각이 정확히 추론돼 결과 타입도
 * 계약에서 파생되고, `as` 없이 건전하다.
 */
function definedFields(patch: TaskPatch): DefinedFields {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.projectId !== undefined ? { projectId: patch.projectId } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.startAt !== undefined ? { startAt: patch.startAt } : {}),
    ...(patch.durationMin !== undefined ? { durationMin: patch.durationMin } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
  };
}

/**
 * 낙관적 캐시 패치용 — 서버가 할 일(지정 필드 적용 + version 증가)을 캐시에 미리 흉내낸다.
 * 서버 결과와의 최종 수렴은 onSettled invalidate가 맡는다 (docs/conventions/web-cache-policy.md).
 */
export function applyTaskPatch(task: Task, patch: TaskPatch): Task {
  return { ...task, ...definedFields(patch), version: task.version + 1 };
}
