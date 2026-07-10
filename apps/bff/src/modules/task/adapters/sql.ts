import type {
  CreateProjectInput,
  CreateTaskInput,
  ListChangesInput,
  ListTasksByProjectInput,
  ListTasksRangeInput,
  ProjectStore,
  ProjectTaskCounts,
  SyncReadStore,
  TaskRefInput,
  TaskStore,
  UpdateTaskInput,
} from '@bff/modules/task/ports';
import type { DatabaseSchema } from '@bff/platform/db/schema';
import { currentSyncSeq, withUserSyncSeq } from '@bff/platform/db/sync';
import { newId } from '@bff/platform/ids';
import { orderKeyAfter } from '@bff/platform/ordering';
import type { Project, ProjectChange, SyncChangesResponse, Task, TaskChange, TaskRangeResponse } from '@tooday/shared';
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

/*
 * 낱개 SELECT는 모듈 함수로 둔다 — 스토어 메서드와 SqlSyncReadStore의 스냅샷
 * 트랜잭션이 같은 쿼리를 공유하기 위해서다 (Transaction은 Kysely에 대입 가능).
 */

function selectProjects(db: Kysely<DatabaseSchema>, userId: string): Promise<Project[]> {
  return db
    .selectFrom('projects')
    .select(['id', 'name', 'color'])
    .where('user_id', '=', userId)
    .where('deleted_at', 'is', null)
    .orderBy('position')
    .orderBy('id')
    .execute();
}

async function selectTasksInRange(db: Kysely<DatabaseSchema>, { userId, from, to }: ListTasksRangeInput): Promise<Task[]> {
  const rows = await db
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

async function selectTaskChanges(db: Kysely<DatabaseSchema>, { userId, cursor }: ListChangesInput): Promise<TaskChange[]> {
  const rows = await db
    .selectFrom('tasks')
    .select(TASK_CHANGE_COLUMNS)
    .where('user_id', '=', userId)
    .where('sync_seq', '>', cursor)
    .orderBy('sync_seq')
    .execute();
  return rows.map(toTaskChange);
}

async function selectProjectChanges(db: Kysely<DatabaseSchema>, { userId, cursor }: ListChangesInput): Promise<ProjectChange[]> {
  const rows = await db
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

/**
 * 풀드 Postgres에서는 쿼리마다 커넥션(=READ COMMITTED 스냅샷)이 다르므로, 데이터와
 * 커서를 REPEATABLE READ 트랜잭션 하나(단일 스냅샷)에서 읽는다. 쓰기는 유저 advisory
 * lock으로 직렬화되어 seq 발급 순서 = 커밋 순서이고 행과 카운터는 같은 트랜잭션에서
 * 커밋되므로, 스냅샷의 counters.seq가 N이면 seq ≤ N인 변경 전부가 그 스냅샷에 보인다
 * — 커서를 counters에서 도출하면 "응답에 없는 변경을 커서가 지나치는" 구멍이 없다.
 */
export class SqlSyncReadStore implements SyncReadStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async range({ userId, from, to }: ListTasksRangeInput): Promise<TaskRangeResponse> {
    return this.db
      .transaction()
      .setIsolationLevel('repeatable read')
      .execute(async (trx) => {
        const cursor = await currentSyncSeq(trx, userId);
        const tasks = await selectTasksInRange(trx, { userId, from, to });
        const projects = await selectProjects(trx, userId);
        return { tasks, projects, cursor };
      });
  }

  async changes({ userId, cursor }: ListChangesInput): Promise<SyncChangesResponse> {
    return this.db
      .transaction()
      .setIsolationLevel('repeatable read')
      .execute(async (trx) => {
        // 카운터에는 행 없는 쓰기(not-found update/remove)의 seq 갭이 있을 수 있어
        // 반환 행의 max보다 앞설 수 있다 — 그래도 스냅샷에 보인 변경은 전부 실렸으므로 안전
        const next = await currentSyncSeq(trx, userId);
        const tasks = await selectTaskChanges(trx, { userId, cursor });
        const projects = await selectProjectChanges(trx, { userId, cursor });
        return { tasks, projects, cursor: Math.max(cursor, next) };
      });
  }
}

export class SqlProjectStore implements ProjectStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async listByUser(userId: string): Promise<Project[]> {
    return selectProjects(this.db, userId);
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
}

export class SqlTaskStore implements TaskStore {
  constructor(private readonly db: Kysely<DatabaseSchema>) {}

  async findById({ userId, id }: TaskRefInput): Promise<Task | null> {
    const row = await this.db
      .selectFrom('tasks')
      .select(TASK_COLUMNS)
      .where('user_id', '=', userId)
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    return row ? toTask(row) : null;
  }

  async listByProject({ userId, projectId }: ListTasksByProjectInput): Promise<Task[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .select(TASK_COLUMNS)
      .where('user_id', '=', userId)
      .where('project_id', '=', projectId)
      .where('deleted_at', 'is', null)
      .orderBy('date')
      .orderBy('start_at')
      .execute();
    return rows.map(toTask);
  }

  async countsByProject(userId: string): Promise<ProjectTaskCounts[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .select((eb) => [
        'project_id',
        eb.fn.countAll().as('total'),
        // COUNT은 NULL을 세지 않으므로 done 행만 1로 남겨 센다
        eb.fn.count(eb.case().when('status', '=', 'done').then(eb.val(1)).end()).as('done'),
      ])
      .where('user_id', '=', userId)
      .where('deleted_at', 'is', null)
      .where('project_id', 'is not', null)
      .groupBy('project_id')
      .execute();
    // pg의 count는 bigint를 문자열로 돌려주므로 여기서 number로 정규화한다
    return rows.map((row) => ({
      projectId: row.project_id as string,
      total: Number(row.total),
      done: Number(row.done),
    }));
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

  async remove({ userId, id }: TaskRefInput): Promise<boolean> {
    return withUserSyncSeq(this.db, userId, async (trx, seq) => {
      const now = new Date();
      const row = await trx
        .updateTable('tasks')
        // tombstone도 쓰기다 — version을 올려 "쓰기마다 단조 증가" 불변식을 지킨다
        .set((eb) => ({ deleted_at: now, updated_at: now, sync_seq: seq, version: eb('version', '+', 1) }))
        .where('user_id', '=', userId)
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .returning('id')
        .executeTakeFirst();
      return row !== undefined;
    });
  }
}
