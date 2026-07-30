import type { ProjectTaskCounts } from '@bff/modules/task/ports';
import type { Project, ProjectSummary, Task, TaskPatch } from '@tooday/shared';
import { match, P } from 'ts-pattern';

/**
 * 태스크 도메인 순수 함수 — I/O·저장소·트랜스포트에 의존하지 않는 비즈니스 규칙만 둔다.
 * 어댑터(memory/sql)와 라우터는 이 함수들을 호출해 같은 규칙을 공유한다.
 */

/** patch에서 undefined를 걷어낸 필드 집합 — 계약(TaskPatch)에서 필드별 타입을 그대로 파생한다 (projectId의 `| null` 보존) */
export type DefinedPatchFields = { [K in keyof TaskPatch]?: Exclude<TaskPatch[K], undefined> };

/**
 * patch에서 값이 지정된 필드만 남긴다 (undefined 제거, null 보존) — 필드 단위 LWW의 적용 대상.
 *
 * 조건부 스프레드로 필드별 타입을 그대로 흘려보낸다 — 각 조각(`{ status: TaskStatus }` 등)이
 * 정확히 추론돼 결과 타입도 계약에서 파생되고, 제네릭 map처럼 값 타입을 유니온으로 뭉개지
 * 않으므로 `as` 없이 건전하다.
 */
export function definedPatchFields(patch: TaskPatch): DefinedPatchFields {
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
 * 낙관적/서버 공통 규칙 — 지정된 필드만 최신 태스크에 적용하고 version을 올린다.
 * 같은 필드의 경합은 나중 의도가 이기고(LWW), 다른 필드끼리는 충돌하지 않는다.
 */
export function applyPatch(task: Task, patch: TaskPatch): Task {
  return { ...task, ...definedPatchFields(patch), version: task.version + 1 };
}

/** 델타 동기화 다음 커서 — 요청 커서와 반환된 모든 변경 seq의 최댓값 (매칭이 아니라 산술) */
export function nextSyncCursor(cursor: number, ...changeLists: { syncSeq: number }[][]): number {
  return changeLists.flat().reduce((max, change) => Math.max(max, change.syncSeq), cursor);
}

/**
 * 프로젝트 목록에 진행률(완료/전체)을 조인한다 — 집계가 없는 프로젝트는 0/0.
 *
 * 집계 유무를 ts-pattern으로 매칭한다 — `.exhaustive()`가 `ProjectTaskCounts | undefined`의
 * 모든 경우(있음/없음)가 처리됐음을 컴파일 타임에 보증한다.
 */
export function attachProjectProgress(projects: Project[], counts: ProjectTaskCounts[]): ProjectSummary[] {
  return projects.map((project) =>
    match(counts.find((count) => count.projectId === project.id))
      .with(P.nonNullable, ({ total, done }) => ({ ...project, totalCount: total, doneCount: done }))
      .with(P.nullish, () => ({ ...project, totalCount: 0, doneCount: 0 }))
      .exhaustive(),
  );
}
