import type { CreateProjectRequest, CreateTaskRequest, Project, Task, TaskStatus } from '@tooday/shared';

export interface CreateProjectInput extends CreateProjectRequest {
  userId: string;
}

export interface CreateTaskInput extends CreateTaskRequest {
  userId: string;
}

export interface ListTasksRangeInput {
  userId: string;
  /** 'YYYY-MM-DD' inclusive */
  from: string;
  /** 'YYYY-MM-DD' inclusive */
  to: string;
}

export interface SetTaskStatusInput {
  userId: string;
  id: string;
  status: TaskStatus;
}

export interface ProjectStore {
  listByUser(userId: string): Promise<Project[]>;
  findById(input: { userId: string; id: string }): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
}

export interface TaskStore {
  listRange(input: ListTasksRangeInput): Promise<Task[]>;
  create(input: CreateTaskInput): Promise<Task>;
  /** 소유자가 아니거나 없는 태스크면 null */
  setStatus(input: SetTaskStatusInput): Promise<Task | null>;
}
