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
  /** 낙관적 잠금 버전 — 쓰기 요청은 읽은 시점의 version을 함께 보내고, 서버는 일치할 때만 반영한다 */
  version: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export const taskRangeRequestSchema = v.object({
  from: isoDateSchema,
  to: isoDateSchema,
});

/** 메인(오늘) 화면 한 번의 조회로 주간 창의 태스크와 프로젝트 라벨을 함께 내려준다 */
export const taskRangeResponseSchema = v.object({
  tasks: v.array(taskSchema),
  projects: v.array(projectSchema),
});

export const createTaskRequestSchema = v.object({
  title: v.pipe(v.string(), v.trim(), v.minLength(1)),
  projectId: v.optional(v.nullable(v.string()), null),
  date: isoDateSchema,
  startAt: isoTimeSchema,
  durationMin: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export const setTaskStatusRequestSchema = v.object({
  id: v.string(),
  status: taskStatusSchema,
  /** 읽은 시점의 version — 불일치(다른 기기에서 먼저 수정)면 CONFLICT */
  version: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export const createProjectRequestSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1)),
  color: projectColorSchema,
});

export type TaskStatus = v.InferOutput<typeof taskStatusSchema>;
export type ProjectColor = v.InferOutput<typeof projectColorSchema>;
export type Project = v.InferOutput<typeof projectSchema>;
export type Task = v.InferOutput<typeof taskSchema>;
export type TaskRangeRequest = v.InferOutput<typeof taskRangeRequestSchema>;
export type TaskRangeResponse = v.InferOutput<typeof taskRangeResponseSchema>;
export type CreateTaskRequest = v.InferOutput<typeof createTaskRequestSchema>;
export type SetTaskStatusRequest = v.InferOutput<typeof setTaskStatusRequestSchema>;
export type CreateProjectRequest = v.InferOutput<typeof createProjectRequestSchema>;
