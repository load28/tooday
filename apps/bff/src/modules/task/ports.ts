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
  /** 낙관적 잠금 — 클라이언트가 읽은 시점의 version */
  version: number;
}

export interface ProjectStore {
  listByUser(userId: string): Promise<Project[]>;
  findById(input: { userId: string; id: string }): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
}

export interface TaskStore {
  listRange(input: ListTasksRangeInput): Promise<Task[]>;
  create(input: CreateTaskInput): Promise<Task>;
  /**
   * 조건부 갱신 — version이 일치할 때만 반영하고 version을 +1 한다.
   * 소유자가 아니거나 없는 태스크면 null, version 불일치면 DomainError(TASK_VERSION_CONFLICT).
   */
  setStatus(input: SetTaskStatusInput): Promise<Task | null>;
}
