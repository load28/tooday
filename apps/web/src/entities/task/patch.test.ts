import type { Task } from '@tooday/shared';
import { describe, expect, it } from 'vitest';
import { applyTaskPatch } from '@/entities/task/patch';

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

describe('applyTaskPatch', () => {
  it('지정된 필드만 반영하고 version을 올린다', () => {
    expect(applyTaskPatch(task, { status: 'done' })).toEqual({ ...task, status: 'done', version: 4 });
  });

  it('undefined 필드는 기존 값을 지우지 않는다', () => {
    expect(applyTaskPatch(task, { title: undefined, status: 'doing' })).toEqual({ ...task, status: 'doing', version: 4 });
  });

  it('null은 값 지정으로 취급한다 — 프로젝트 해제가 낙관적으로 반영된다', () => {
    expect(applyTaskPatch(task, { projectId: null }).projectId).toBeNull();
  });
});
