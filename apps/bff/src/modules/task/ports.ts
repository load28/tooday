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

/** 소유자 스코프의 단건 참조 — 조회·삭제·프로젝트 필터에서 재사용 */
export interface TaskRefInput {
  userId: string;
  id: string;
}

export interface ListTasksByProjectInput {
  userId: string;
  projectId: string;
}

/** 프로젝트별 태스크 집계 — 목록 화면의 진행률(완료/전체)에 쓴다 (삭제 제외) */
export interface ProjectTaskCounts {
  projectId: string;
  total: number;
  done: number;
}

export interface ProjectStore {
  listByUser(userId: string): Promise<Project[]>;
  findById(input: { userId: string; id: string }): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  changesSince(input: ListChangesInput): Promise<ProjectChange[]>;
}

export interface TaskStore {
  listRange(input: ListTasksRangeInput): Promise<Task[]>;
  /** 소유자가 아니거나 없는(또는 삭제된) 태스크면 null */
  findById(input: TaskRefInput): Promise<Task | null>;
  /** 프로젝트 상세(보드)용 — 그 프로젝트의 삭제되지 않은 태스크 전부(상태 무관) */
  listByProject(input: ListTasksByProjectInput): Promise<Task[]>;
  /** 프로젝트별 완료/전체 태스크 수 — 프로젝트 없는(project_id null) 태스크는 제외 */
  countsByProject(userId: string): Promise<ProjectTaskCounts[]>;
  create(input: CreateTaskInput): Promise<Task>;
  /** 소유자가 아니거나 없는(또는 삭제된) 태스크면 null */
  update(input: UpdateTaskInput): Promise<Task | null>;
  /** 소프트 삭제 — tombstone으로 델타에 실린다. 대상이 없으면(또는 이미 삭제) false */
  remove(input: TaskRefInput): Promise<boolean>;
  changesSince(input: ListChangesInput): Promise<TaskChange[]>;
  /** 유저의 현재 sync seq — 클라이언트의 초기 커서 */
  syncCursor(userId: string): Promise<number>;
}
