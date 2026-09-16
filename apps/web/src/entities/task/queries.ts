import { and, type Collection, eq, gte, type InitialQueryBuilder, lte } from '@tanstack/react-db';
import type { Task, TaskScope } from '@tooday/shared';

export function taskQuery(data: { tasks: Collection<Task, string> }, scope: Exclude<TaskScope, { kind: 'projects' }>) {
  return (q: InitialQueryBuilder) => {
    const query = q.from({ task: data.tasks });
    switch (scope.kind) {
      case 'task':
        return query.where(({ task }) => eq(task.id, scope.id));
      case 'project':
        return query.where(({ task }) => eq(task.projectId, scope.projectId));
      case 'range':
        return query.where(({ task }) => and(gte(task.date, scope.from), lte(task.date, scope.to)));
    }
  };
}
