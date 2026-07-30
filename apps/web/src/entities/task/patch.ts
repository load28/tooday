import type { Task, TaskPatch } from '@tooday/shared';

/**
 * patch에서 값이 지정된 필드만 (undefined 스프레드로 기존 값을 지우지 않게, null은 보존).
 *
 * 이종 구조체를 필드별로 명시 복사한다 — 각 대입을 컴파일러가 Task의 필드 타입으로 검증하므로
 * `as` 없이 건전하다 (제네릭 map은 값 타입을 단일 유니온으로 뭉개 캐스팅을 강제한다).
 */
function definedFields(patch: TaskPatch): Partial<Task> {
  const fields: Partial<Task> = {};
  if (patch.title !== undefined) fields.title = patch.title;
  if (patch.projectId !== undefined) fields.projectId = patch.projectId;
  if (patch.date !== undefined) fields.date = patch.date;
  if (patch.startAt !== undefined) fields.startAt = patch.startAt;
  if (patch.durationMin !== undefined) fields.durationMin = patch.durationMin;
  if (patch.status !== undefined) fields.status = patch.status;
  return fields;
}

/**
 * 낙관적 캐시 패치용 — 서버가 할 일(지정 필드 적용 + version 증가)을 캐시에 미리 흉내낸다.
 * 서버 결과와의 최종 수렴은 onSettled invalidate가 맡는다 (docs/conventions/web-cache-policy.md).
 */
export function applyTaskPatch(task: Task, patch: TaskPatch): Task {
  return { ...task, ...definedFields(patch), version: task.version + 1 };
}
