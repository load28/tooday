import * as v from 'valibot';

export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;
export const taskStatusSchema = v.picklist(TASK_STATUSES);

export const PROJECT_COLORS = ['blue', 'mint', 'violet', 'amber', 'pink', 'gray'] as const;
export const projectColorSchema = v.picklist(PROJECT_COLORS);

/** 'YYYY-MM-DD' — 시간대 없는 사용자 로컬 캘린더 날짜. 문자열 비교가 곧 날짜 비교다. */
const isoDateSchema = v.pipe(v.string(), v.isoDate());
/** 'HH:mm' */
const isoTimeSchema = v.pipe(v.string(), v.isoTime());

export const projectSchema = v.object({
  id: v.string(),
  name: v.string(),
  color: projectColorSchema,
});

export const taskSchema = v.object({
  id: v.string(),
  projectId: v.nullable(v.string()),
  title: v.string(),
  date: isoDateSchema,
  startAt: isoTimeSchema,
  durationMin: v.pipe(v.number(), v.integer(), v.minValue(1)),
  status: taskStatusSchema,
  /**
   * 행 변경 카운터 — 쓰기마다 서버가 +1 (캐시 검증·디버깅용).
   * 낙관적 잠금이 아니다: 쓰기 요청은 version을 보내지 않고 서버도 비교하지 않는다.
   * 동시 쓰기 수렴은 필드 단위 LWW(taskPatchSchema 참고)로 한다 — 409 없음.
   */
  version: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export const taskRangeRequestSchema = v.object({
  from: isoDateSchema,
  to: isoDateSchema,
});

/**
 * 메인(오늘) 화면 한 번의 조회로 주간 창의 태스크·프로젝트 라벨과
 * 동기화 커서(이 유저의 현재 sync seq)를 함께 내려준다.
 */
export const taskRangeResponseSchema = v.object({
  tasks: v.array(taskSchema),
  projects: v.array(projectSchema),
  cursor: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

export const createTaskRequestSchema = v.object({
  title: v.pipe(v.string(), v.trim(), v.minLength(1)),
  projectId: v.optional(v.nullable(v.string()), null),
  date: isoDateSchema,
  startAt: isoTimeSchema,
  durationMin: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

/**
 * 의도(intent) 기반 부분 업데이트 — 바꾸려는 필드만 보낸다.
 * 서버는 최신 행에 이 필드들만 적용하므로(필드 단위 LWW) 행 전체 덮어쓰기가 없고,
 * 같은 필드를 두 기기가 고치면 나중 의도가 이긴다. 409는 발생하지 않는다.
 */
export const taskPatchSchema = v.object({
  title: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1))),
  projectId: v.optional(v.nullable(v.string())),
  date: v.optional(isoDateSchema),
  startAt: v.optional(isoTimeSchema),
  durationMin: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  status: v.optional(taskStatusSchema),
});

export const updateTaskRequestSchema = v.object({
  id: v.string(),
  patch: v.pipe(
    taskPatchSchema,
    v.check((patch) => Object.values(patch).some((value) => value !== undefined), 'patch에 바꿀 필드가 최소 하나 필요합니다'),
  ),
});

/** 델타 동기화 — 커서(마지막으로 본 sync seq) 이후 바뀐 행을 전부 내려준다. tombstone 포함 */
export const syncChangesRequestSchema = v.object({
  cursor: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

export const taskChangeSchema = v.object({
  ...taskSchema.entries,
  syncSeq: v.pipe(v.number(), v.integer(), v.minValue(1)),
  deleted: v.boolean(),
});

export const projectChangeSchema = v.object({
  ...projectSchema.entries,
  syncSeq: v.pipe(v.number(), v.integer(), v.minValue(1)),
  deleted: v.boolean(),
});

export const syncChangesResponseSchema = v.object({
  tasks: v.array(taskChangeSchema),
  projects: v.array(projectChangeSchema),
  /** 다음 요청에 쓸 커서 — max(요청 커서, 반환된 변경의 최대 seq) */
  cursor: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

/** SSE 신호 채널 경로 — 데이터는 싣지 않고 "네 데이터 바뀜"만 알린다. 클라이언트는 신호를 받으면 델타를 당긴다 */
export const SYNC_EVENTS_PATH = '/sync/events';

/** 단건 조회·삭제 요청 — 태스크 id만 */
export const taskIdRequestSchema = v.object({
  id: v.string(),
});

export const createProjectRequestSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1)),
  color: projectColorSchema,
});

/** 프로젝트 상세(보드) 요청 — 프로젝트 id */
export const projectDetailRequestSchema = v.object({
  projectId: v.string(),
});

/**
 * 프로젝트 목록 화면용 요약 — 프로젝트 라벨에 진행률(완료/전체 태스크 수)을 얹는다.
 * 카운트는 삭제되지 않은 태스크 기준이며 서버가 집계해 내려준다.
 */
export const projectSummarySchema = v.object({
  ...projectSchema.entries,
  totalCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  doneCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

export const projectListResponseSchema = v.object({
  projects: v.array(projectSummarySchema),
});

/** 프로젝트 상세 — 프로젝트 라벨과 그 프로젝트에 속한 태스크 전부(상태 무관) */
export const projectDetailResponseSchema = v.object({
  project: projectSchema,
  tasks: v.array(taskSchema),
});

export type TaskStatus = v.InferOutput<typeof taskStatusSchema>;
export type ProjectColor = v.InferOutput<typeof projectColorSchema>;
export type Project = v.InferOutput<typeof projectSchema>;
export type Task = v.InferOutput<typeof taskSchema>;
export type TaskRangeRequest = v.InferOutput<typeof taskRangeRequestSchema>;
export type TaskRangeResponse = v.InferOutput<typeof taskRangeResponseSchema>;
export type CreateTaskRequest = v.InferOutput<typeof createTaskRequestSchema>;
export type TaskPatch = v.InferOutput<typeof taskPatchSchema>;
export type UpdateTaskRequest = v.InferOutput<typeof updateTaskRequestSchema>;
export type SyncChangesRequest = v.InferOutput<typeof syncChangesRequestSchema>;
export type TaskChange = v.InferOutput<typeof taskChangeSchema>;
export type ProjectChange = v.InferOutput<typeof projectChangeSchema>;
export type SyncChangesResponse = v.InferOutput<typeof syncChangesResponseSchema>;
export type TaskIdRequest = v.InferOutput<typeof taskIdRequestSchema>;
export type CreateProjectRequest = v.InferOutput<typeof createProjectRequestSchema>;
export type ProjectDetailRequest = v.InferOutput<typeof projectDetailRequestSchema>;
export type ProjectSummary = v.InferOutput<typeof projectSummarySchema>;
export type ProjectListResponse = v.InferOutput<typeof projectListResponseSchema>;
export type ProjectDetailResponse = v.InferOutput<typeof projectDetailResponseSchema>;
