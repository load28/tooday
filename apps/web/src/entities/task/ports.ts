import type {
  CreateProjectRequest,
  CreateTaskRequest,
  Project,
  ProjectListResponse,
  SyncChangesResponse,
  Task,
  TaskRangeResponse,
  TaskScope,
  UpdateTaskRequest,
} from '@tooday/shared';

/** 인증·URL·tRPC는 조립 층이 제공한다. 도메인 계층은 전송 구현을 모른다. */
export interface TaskTransport {
  snapshot(scope: TaskScope, signal: AbortSignal): Promise<TaskRangeResponse>;
  changes(cursor: number, signal: AbortSignal): Promise<SyncChangesResponse>;
  update(input: UpdateTaskRequest, signal: AbortSignal): Promise<{ task: Task }>;
  create(input: CreateTaskRequest, signal: AbortSignal): Promise<{ task: Task }>;
  remove(id: string, signal: AbortSignal): Promise<{ id: string }>;
  createProject(input: CreateProjectRequest, signal: AbortSignal): Promise<{ project: Project }>;
  /** 변경 신호는 데이터가 아니다. 재연결에서도 listener를 호출해야 한다. */
  subscribe(listener: () => void): () => void;
  /** 서버가 계산한 전체 프로젝트 집계. */
  summaries(signal: AbortSignal): Promise<ProjectListResponse>;
}
