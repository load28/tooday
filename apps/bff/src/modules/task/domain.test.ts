import { describe, expect, it } from 'bun:test';
import { applyPatch, attachProjectProgress, definedPatchFields, nextSyncCursor } from '@bff/modules/task/domain';
import type { ProjectTaskCounts } from '@bff/modules/task/ports';
import type { Project, Task } from '@tooday/shared';

const task: Task = {
  id: 't1',
  projectId: 'p1',
  title: '회의',
  date: '2026-07-08',
  startAt: '09:00',
  durationMin: 30,
  status: 'todo',
  version: 3,
};

describe('definedPatchFields', () => {
  it('값이 지정된 필드만 남긴다', () => {
    expect(definedPatchFields({ status: 'done', title: '수정' })).toEqual({ status: 'done', title: '수정' });
  });

  it('undefined 필드는 버린다 (기존 값을 지우지 않게)', () => {
    expect(definedPatchFields({ title: undefined, status: 'doing' })).toEqual({ status: 'doing' });
  });

  it('null은 값 지정으로 보존한다 — 프로젝트 해제', () => {
    expect(definedPatchFields({ projectId: null })).toEqual({ projectId: null });
  });

  it('빈 patch는 빈 객체', () => {
    expect(definedPatchFields({})).toEqual({});
  });
});

describe('applyPatch', () => {
  it('지정 필드를 적용하고 version을 올린다', () => {
    expect(applyPatch(task, { status: 'done' })).toEqual({ ...task, status: 'done', version: 4 });
  });

  it('undefined는 기존 값을 지우지 않는다', () => {
    expect(applyPatch(task, { title: undefined, status: 'doing' })).toEqual({ ...task, status: 'doing', version: 4 });
  });

  it('null 프로젝트 해제를 반영한다', () => {
    expect(applyPatch(task, { projectId: null }).projectId).toBeNull();
  });

  it('빈 patch여도 version은 오른다', () => {
    expect(applyPatch(task, {})).toEqual({ ...task, version: 4 });
  });

  it('입력 태스크를 변형하지 않는다 (순수)', () => {
    applyPatch(task, { status: 'done' });
    expect(task.status).toBe('todo');
    expect(task.version).toBe(3);
  });
});

describe('nextSyncCursor', () => {
  it('커서와 모든 변경 seq의 최댓값', () => {
    expect(nextSyncCursor(2, [{ syncSeq: 5 }], [{ syncSeq: 3 }, { syncSeq: 7 }])).toBe(7);
  });

  it('변경이 없으면 커서를 그대로 둔다', () => {
    expect(nextSyncCursor(9, [], [])).toBe(9);
  });

  it('모든 seq가 커서 이하면 커서가 유지된다', () => {
    expect(nextSyncCursor(10, [{ syncSeq: 4 }], [{ syncSeq: 10 }])).toBe(10);
  });
});

describe('attachProjectProgress', () => {
  const projects: Project[] = [
    { id: 'p1', name: '일상', color: 'mint' },
    { id: 'p2', name: 'TooDay', color: 'blue' },
  ];

  it('프로젝트별 카운트를 진행률로 붙인다', () => {
    const counts: ProjectTaskCounts[] = [{ projectId: 'p1', total: 3, done: 1 }];
    expect(attachProjectProgress(projects, counts)).toEqual([
      { id: 'p1', name: '일상', color: 'mint', totalCount: 3, doneCount: 1 },
      { id: 'p2', name: 'TooDay', color: 'blue', totalCount: 0, doneCount: 0 },
    ]);
  });

  it('카운트 없는 프로젝트는 0/0으로 채운다', () => {
    expect(attachProjectProgress(projects, [])).toEqual([
      { id: 'p1', name: '일상', color: 'mint', totalCount: 0, doneCount: 0 },
      { id: 'p2', name: 'TooDay', color: 'blue', totalCount: 0, doneCount: 0 },
    ]);
  });

  it('프로젝트 순서를 보존한다', () => {
    const counts: ProjectTaskCounts[] = [{ projectId: 'p2', total: 1, done: 0 }];
    expect(attachProjectProgress(projects, counts).map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});
