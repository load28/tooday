import type {
  CreateProjectInput,
  CreateTaskInput,
  ListTasksRangeInput,
  ProjectStore,
  SetTaskStatusInput,
  TaskStore,
} from '@bff/modules/task/ports';
import type { DatabaseSchema, TasksTable } from '@bff/platform/db/schema';
import type { Project, Task } from '@tooday/shared';
import type { Kysely } from 'kysely';

function toTask(row: Omit<TasksTable, 'user_id'>): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    date: row.date,
    startAt: row.start_at,
    durationMin: row.duration_min,
    status: row.status,
  };
}

export class SqlProjectStore implements ProjectStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async listByUser(userId: string): Promise<Project[]> {
    return this.db.selectFrom('projects').select(['id', 'name', 'color']).where('user_id', '=', userId).orderBy('name').execute();
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
    const project: Project = { id: crypto.randomUUID(), name, color };
    await this.db
      .insertInto('projects')
      .values({ ...project, user_id: userId })
      .execute();
    return project;
  }
}

export class SqlTaskStore implements TaskStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async listRange({ userId, from, to }: ListTasksRangeInput): Promise<Task[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .select(['id', 'project_id', 'title', 'date', 'start_at', 'duration_min', 'status'])
      .where('user_id', '=', userId)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .orderBy('date')
      .orderBy('start_at')
      .execute();
    return rows.map(toTask);
  }

  async create({ userId, title, projectId, date, startAt, durationMin }: CreateTaskInput): Promise<Task> {
    const task: Task = { id: crypto.randomUUID(), projectId, title, date, startAt, durationMin, status: 'todo' };
    await this.db
      .insertInto('tasks')
      .values({
        id: task.id,
        user_id: userId,
        project_id: task.projectId,
        title: task.title,
        date: task.date,
        start_at: task.startAt,
        duration_min: task.durationMin,
        status: task.status,
      })
      .execute();
    return task;
  }

  async setStatus({ userId, id, status }: SetTaskStatusInput): Promise<Task | null> {
    const row = await this.db
      .updateTable('tasks')
      .set({ status })
      .where('user_id', '=', userId)
      .where('id', '=', id)
      .returning(['id', 'project_id', 'title', 'date', 'start_at', 'duration_min', 'status'])
      .executeTakeFirst();
    return row ? toTask(row) : null;
  }
}
