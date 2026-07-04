import type {
  CreateProjectInput,
  CreateTaskInput,
  ListTasksRangeInput,
  ProjectStore,
  SetTaskStatusInput,
  TaskStore,
} from '@bff/modules/task/ports';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { newId } from '@bff/platform/ids';
import { orderKeyAfter } from '@bff/platform/ordering';
import type { Project, Task } from '@tooday/shared';
import type { Kysely } from 'kysely';

const TASK_COLUMNS = ['id', 'project_id', 'title', 'date', 'start_at', 'duration_min', 'status', 'version'] as const;

interface TaskRow {
  id: string;
  project_id: string | null;
  title: string;
  date: string;
  start_at: string;
  duration_min: number;
  status: Task['status'];
  version: number;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    date: row.date,
    startAt: row.start_at,
    durationMin: row.duration_min,
    status: row.status,
    version: row.version,
  };
}

export class SqlProjectStore implements ProjectStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async listByUser(userId: string): Promise<Project[]> {
    return this.db
      .selectFrom('projects')
      .select(['id', 'name', 'color'])
      .where('user_id', '=', userId)
      .orderBy('position')
      .orderBy('id')
      .execute();
  }

  async findById({ userId, id }: { userId: string; id: string }): Promise<Project | null> {
    const row = await this.db
      .selectFrom('projects')
      .select(['id', 'name', 'color'])
      .where('user_id', '=', userId)
      .where('id', '=', id)
      .executeTakeFirst();
    return row ?? null;
  }

  async create({ userId, name, color }: CreateProjectInput): Promise<Project> {
    const last = await this.db
      .selectFrom('projects')
      .select('position')
      .where('user_id', '=', userId)
      .orderBy('position', 'desc')
      .limit(1)
      .executeTakeFirst();
    const project: Project = { id: newId(), name, color };
    await this.db
      .insertInto('projects')
      .values({ ...project, user_id: userId, position: orderKeyAfter(last?.position ?? null) })
      .execute();
    return project;
  }
}

export class SqlTaskStore implements TaskStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async listRange({ userId, from, to }: ListTasksRangeInput): Promise<Task[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .select(TASK_COLUMNS)
      .where('user_id', '=', userId)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .orderBy('date')
      .orderBy('start_at')
      .execute();
    return rows.map(toTask);
  }

  async create({ userId, title, projectId, date, startAt, durationMin }: CreateTaskInput): Promise<Task> {
    const last = await this.db
      .selectFrom('tasks')
      .select('position')
      .where('user_id', '=', userId)
      .orderBy('position', 'desc')
      .limit(1)
      .executeTakeFirst();
    const row = await this.db
      .insertInto('tasks')
      .values({
        id: newId(),
        user_id: userId,
        project_id: projectId,
        title,
        date,
        start_at: startAt,
        duration_min: durationMin,
        status: 'todo',
        position: orderKeyAfter(last?.position ?? null),
        completed_at: null,
      })
      .returning(TASK_COLUMNS)
      .executeTakeFirstOrThrow();
    return toTask(row);
  }

  async setStatus({ userId, id, status, version }: SetTaskStatusInput): Promise<Task | null> {
    const now = new Date();
    const row = await this.db
      .updateTable('tasks')
      .set((eb) => ({
        status,
        version: eb('version', '+', 1),
        completed_at: status === 'done' ? now : null,
        updated_at: now,
      }))
      .where('user_id', '=', userId)
      .where('id', '=', id)
      .where('version', '=', version)
      .returning(TASK_COLUMNS)
      .executeTakeFirst();
    if (row) return toTask(row);

    // 실패 원인 구분: 행이 존재하면 버전 불일치, 아니면 없는/남의 태스크
    const exists = await this.db
      .selectFrom('tasks')
      .select('id')
      .where('user_id', '=', userId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (exists) {
      throw new DomainError(DOMAIN_ERROR_CODES.TASK_VERSION_CONFLICT);
    }
    return null;
  }
}
