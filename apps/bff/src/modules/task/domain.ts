import type { ProjectTaskCounts } from '@bff/modules/task/ports';
import type { Project, ProjectSummary, Task, TaskPatch } from '@tooday/shared';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as N from 'fp-ts/number';
import * as O from 'fp-ts/Option';
import { max } from 'fp-ts/Ord';
import * as R from 'fp-ts/Record';

/**
 * 태스크 도메인 순수 함수 — I/O·저장소·트랜스포트에 의존하지 않는 비즈니스 규칙만 둔다.
 * 어댑터(memory/sql)와 라우터는 이 함수들을 호출해 같은 규칙을 공유한다.
 */

/** undefined만 "미지정" — null은 값 지정(프로젝트 해제)이므로 보존한다 */
const fromDefined = <T>(value: T | undefined): O.Option<T> => (value === undefined ? O.none : O.some(value));

/** patch에서 값이 지정된 필드만 남긴다 (undefined 제거, null 보존) — 필드 단위 LWW의 적용 대상 */
export function definedPatchFields(patch: TaskPatch): Partial<Task> {
  return pipe(patch as Record<string, string | number | null | undefined>, R.filterMap(fromDefined)) as Partial<Task>;
}

/**
 * 낙관적/서버 공통 규칙 — 지정된 필드만 최신 태스크에 적용하고 version을 올린다.
 * 같은 필드의 경합은 나중 의도가 이기고(LWW), 다른 필드끼리는 충돌하지 않는다.
 */
export function applyPatch(task: Task, patch: TaskPatch): Task {
  return { ...task, ...definedPatchFields(patch), version: task.version + 1 };
}

/** 델타 동기화 다음 커서 — 요청 커서와 반환된 모든 변경 seq의 최댓값 */
export function nextSyncCursor(cursor: number, ...changeLists: { syncSeq: number }[][]): number {
  return pipe(
    changeLists,
    A.flatten,
    A.map((change) => change.syncSeq),
    A.reduce(cursor, max(N.Ord)),
  );
}

/** 프로젝트 목록에 진행률(완료/전체)을 조인한다 — 집계가 없는 프로젝트는 0/0 */
export function attachProjectProgress(projects: Project[], counts: ProjectTaskCounts[]): ProjectSummary[] {
  return pipe(
    projects,
    A.map((project) =>
      pipe(
        counts,
        A.findFirst((count) => count.projectId === project.id),
        O.match(
          () => ({ ...project, totalCount: 0, doneCount: 0 }),
          (count) => ({ ...project, totalCount: count.total, doneCount: count.done }),
        ),
      ),
    ),
  );
}
