import type {
  CreateProjectInput,
  CreateTaskInput,
  ListChangesInput,
  ListTasksRangeInput,
  ProjectStore,
  TaskStore,
  UpdateTaskInput,
} from '@bff/modules/task/ports';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import { currentSyncSeq, withUserSyncSeq } from '@bff/platform/db/sync';
import { newId } from '@bff/platform/ids';
import { orderKeyAfter } from '@bff/platform/ordering';
import type { Project, ProjectChange, Task, TaskChange } from '@tooday/shared';
import type { Kysely } from 'kysely';

const TASK_COLUMNS = ['id', 'project_id', 'title', 'date', 'start_at', 'duration_min', 'status', 'version'] as const;
const TASK_CHANGE_COLUMNS = [...TASK_COLUMNS, 'sync_seq', 'deleted_at'] as const;

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

function toTaskChange(row: TaskRow & { sync_seq: number; deleted_at: Date | null }): TaskChange {
  return { ...toTask(row), syncSeq: row.sync_seq, deleted: row.deleted_at !== null };
}

export class SqlProjectStore implements ProjectStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async listByUser(userId: string): Promise<Project[]> {
    return this.db
      .selectFrom('projects')
      .select(['id', 'name', 'color'])
      .where('user_id', '=', userId)
      .where('deleted_at', 'is', null)
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
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    return row ?? null;
  }

  async create({ userId, name, color }: CreateProjectInput): Promise<Project> {
    return withUserSyncSeq(this.db, userId, async (trx, seq) => {
      const last = await trx
        .selectFrom('projects')
        .select('position')
        .where('user_id', '=', userId)
        .orderBy('position', 'desc')
        .limit(1)
        .executeTakeFirst();
      const project: Project = { id: newId(), name, color };
      await trx
        .insertInto('projects')
        .values({
          ...project,
          user_id: userId,
          position: orderKeyAfter(last?.position ?? null),
          sync_seq: seq,
          deleted_at: null,
        })
        .execute();
      return project;
    });
  }

  async changesSince({ userId, cursor }: ListChangesInput): Promise<ProjectChange[]> {
    const rows = await this.db
      .selectFrom('projects')
      .select(['id', 'name', 'color', 'sync_seq', 'deleted_at'])
      .where('user_id', '=', userId)
      .where('sync_seq', '>', cursor)
      .orderBy('sync_seq')
      .execute();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      syncSeq: row.sync_seq,
      deleted: row.deleted_at !== null,
    }));
  }
}

export class SqlTaskStore implements TaskStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async listRange({ userId, from, to }: ListTasksRangeInput): Promise<Task[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .select(TASK_COLUMNS)
      .where('user_id', '=', userId)
      .where('deleted_at', 'is', null)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .orderBy('date')
      .orderBy('start_at')
      .execute();
    return rows.map(toTask);
  }

  async create({ userId, title, projectId, date, startAt, durationMin }: CreateTaskInput): Promise<Task> {
    return withUserSyncSeq(this.db, userId, async (trx, seq) => {
      const last = await trx
        .selectFrom('tasks')
        .select('position')
        .where('user_id', '=', userId)
        .orderBy('position', 'desc')
        .limit(1)
        .executeTakeFirst();
      const row = await trx
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
          sync_seq: seq,
          deleted_at: null,
          completed_at: null,
        })
        .returning(TASK_COLUMNS)
        .executeTakeFirstOrThrow();
      return toTask(row);
    });
  }

  async update({ userId, id, patch }: UpdateTaskInput): Promise<Task | null> {
    return withUserSyncSeq(this.db, userId, async (trx, seq) => {
      const now = new Date();
      const row = await trx
        .updateTable('tasks')
        .set((eb) => ({
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.projectId !== undefined ? { project_id: patch.projectId } : {}),
          ...(patch.date !== undefined ? { date: patch.date } : {}),
          ...(patch.startAt !== undefined ? { start_at: patch.startAt } : {}),
          ...(patch.durationMin !== undefined ? { duration_min: patch.durationMin } : {}),
          ...(patch.status !== undefined ? { status: patch.status, completed_at: patch.status === 'done' ? now : null } : {}),
          version: eb('version', '+', 1),
          updated_at: now,
          sync_seq: seq,
        }))
        .where('user_id', '=', userId)
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .returning(TASK_COLUMNS)
        .executeTakeFirst();
      return row ? toTask(row) : null;
    });
  }

  async changesSince({ userId, cursor }: ListChangesInput): Promise<TaskChange[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .select(TASK_CHANGE_COLUMNS)
      .where('user_id', '=', userId)
      .where('sync_seq', '>', cursor)
      .orderBy('sync_seq')
      .execute();
    return rows.map(toTaskChange);
  }

  async syncCursor(userId: string): Promise<number> {
    return currentSyncSeq(this.db, userId);
  }
}
