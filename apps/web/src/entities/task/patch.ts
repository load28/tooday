import type { Task, TaskPatch } from '@tooday/shared';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as R from 'fp-ts/Record';

/** undefined만 "미지정" — null은 값 지정(프로젝트 해제)이므로 보존한다 */
const fromDefined = <T>(value: T | undefined): O.Option<T> => (value === undefined ? O.none : O.some(value));

/** patch에서 값이 지정된 필드만 (undefined 스프레드로 기존 값을 지우지 않게, null은 보존) */
function definedFields(patch: TaskPatch): Partial<Task> {
  return pipe(patch as Record<string, string | number | null | undefined>, R.filterMap(fromDefined)) as Partial<Task>;
}

/**
 * 낙관적 캐시 패치용 — 서버가 할 일(지정 필드 적용 + version 증가)을 캐시에 미리 흉내낸다.
 * 서버 결과와의 최종 수렴은 onSettled invalidate가 맡는다 (docs/conventions/web-cache-policy.md).
 */
export function applyTaskPatch(task: Task, patch: TaskPatch): Task {
  return { ...task, ...definedFields(patch), version: task.version + 1 };
}
