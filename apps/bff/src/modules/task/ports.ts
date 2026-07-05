import type {
  CreateProjectRequest,
  CreateTaskRequest,
  Project,
  ProjectChange,
  Task,
  TaskChange,
  TaskPatch,
} from '@tooday/shared';

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

/** 의도 기반 부분 업데이트 — patch에 담긴 필드만 최신 행에 적용한다 (필드 단위 LWW) */
export interface UpdateTaskInput {
  userId: string;
  id: string;
  patch: TaskPatch;
}

/** 델타 동기화 — cursor(마지막으로 본 sync seq) 이후의 변경 */
export interface ListChangesInput {
  userId: string;
  cursor: number;
}

export interface ProjectStore {
  listByUser(userId: string): Promise<Project[]>;
  findById(input: { userId: string; id: string }): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  changesSince(input: ListChangesInput): Promise<ProjectChange[]>;
}

export interface TaskStore {
  listRange(input: ListTasksRangeInput): Promise<Task[]>;
  create(input: CreateTaskInput): Promise<Task>;
  /** 소유자가 아니거나 없는(또는 삭제된) 태스크면 null */
  update(input: UpdateTaskInput): Promise<Task | null>;
  changesSince(input: ListChangesInput): Promise<TaskChange[]>;
  /** 유저의 현재 sync seq — 클라이언트의 초기 커서 */
  syncCursor(userId: string): Promise<number>;
}
