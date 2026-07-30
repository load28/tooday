import type { ProjectTaskCounts } from '@bff/modules/task/ports';
import type { Project, ProjectSummary, Task, TaskPatch } from '@tooday/shared';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as N from 'fp-ts/number';
import * as O from 'fp-ts/Option';
import { max } from 'fp-ts/Ord';

/**
 * 태스크 도메인 순수 함수 — I/O·저장소·트랜스포트에 의존하지 않는 비즈니스 규칙만 둔다.
 * 어댑터(memory/sql)와 라우터는 이 함수들을 호출해 같은 규칙을 공유한다.
 */

/**
 * patch에서 값이 지정된 필드만 남긴다 (undefined 제거, null 보존) — 필드 단위 LWW의 적용 대상.
 *
 * 이종 구조체를 필드별로 명시 복사한다 — 제네릭 map(fp-ts `filterMap` 등)은 값 타입을
 * 단일 유니온으로 뭉개 캐스팅을 강제하지만, 여기선 각 대입을 컴파일러가 Task의 필드 타입으로
 * 검증하므로 `as` 없이 건전하다.
 */
export function definedPatchFields(patch: TaskPatch): Partial<Task> {
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
