import { extractSimpleComparisons, type LoadSubsetOptions } from '@tanstack/react-db';
import type { Task, TaskScope } from '@tooday/shared';

export function scopeKey(scope: TaskScope): string {
  switch (scope.kind) {
    case 'range':
      return JSON.stringify(['range', scope.from, scope.to]);
    case 'task':
      return JSON.stringify(['task', scope.id]);
    case 'project':
      return JSON.stringify(['project', scope.projectId]);
    case 'projects':
      return 'projects';
  }
}

export function matchesScope(task: Task, scope: TaskScope): boolean {
  switch (scope.kind) {
    case 'range':
      return task.date >= scope.from && task.date <= scope.to;
    case 'task':
      return task.id === scope.id;
    case 'project':
      return task.projectId === scope.projectId;
    case 'projects':
      return false;
  }
}

/** 허용한 조회 계약만 번역한다. 지원하지 않는 식을 전체 다운로드로 조용히 바꾸지 않는다. */
export function scopeFromSubset(options: LoadSubsetOptions): TaskScope {
  const comparisons = extractSimpleComparisons(options.where);
  const value = (field: string, operator: string): string | undefined => {
    const candidate: unknown = comparisons.find(
      (item) => item.field.length === 1 && item.field[0] === field && item.operator === operator,
    )?.value;
    return typeof candidate === 'string' ? candidate : undefined;
  };
  const id = value('id', 'eq');
  if (id !== undefined) return { kind: 'task', id };
  const projectId = value('projectId', 'eq');
  if (projectId !== undefined) return { kind: 'project', projectId };
  const from = value('date', 'gte');
  const to = value('date', 'lte');
  if (from !== undefined && to !== undefined) return { kind: 'range', from, to };
  throw new Error('Task 조회에는 ID, 프로젝트 ID 또는 날짜 범위가 필요합니다.');
}
