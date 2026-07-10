import type {
  CreateProjectRequest,
  CreateTaskRequest,
  Project,
  SyncChangesResponse,
  Task,
  TaskPatch,
  TaskRangeResponse,
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
}

export interface TaskStore {
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
}

/**
 * 동기화 읽기 — 데이터와 커서를 **단일 스냅샷**에서 함께 읽는다.
 *
 * 커서는 반환된 행들의 max가 아니라 같은 스냅샷에서 읽은 sync_counters에서
 * 도출한다 (커서 ≤ 데이터 스냅샷 보장). 낱개 조회(listRange·changesSince·
 * syncCursor)를 포트에 노출하지 않는 이유: 호출자가 그것들을 별도 커넥션
 * (=별도 스냅샷)에서 조합하면, 두 읽기 사이에 커밋된 변경을 응답에서 빠뜨린 채
 * 커서만 전진시켜 그 변경이 영구 유실되는 구멍이 생긴다.
 */
export interface SyncReadStore {
  /** 초기 로드 — 주간 창 태스크 + 프로젝트 + 커서 베이스라인을 한 스냅샷에서 */
  range(input: ListTasksRangeInput): Promise<TaskRangeResponse>;
  /** 델타 — 커서 이후의 태스크·프로젝트 변경(tombstone 포함) + 전진한 커서를 한 스냅샷에서 */
  changes(input: ListChangesInput): Promise<SyncChangesResponse>;
}
