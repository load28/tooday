import { applyPatch } from '@bff/modules/task/domain';
import type {
  CreateProjectInput,
  CreateTaskInput,
  ListChangesInput,
  ListTasksByProjectInput,
  ListTasksRangeInput,
  ProjectStore,
  ProjectTaskCounts,
  TaskRefInput,
  TaskStore,
  UpdateTaskInput,
} from '@bff/modules/task/ports';
import { newId } from '@bff/platform/ids';
import { orderKeyAfter } from '@bff/platform/ordering';
import type { Project, ProjectChange, Task, TaskChange } from '@tooday/shared';

/** 유저별 단조증가 seq — SQL 구현의 sync_counters에 대응. 두 스토어가 하나를 공유해야 한다 */
export class InMemorySyncCounter {
  private readonly seqs = new Map<string, number>();

  next(userId: string): number {
    const next = (this.seqs.get(userId) ?? 0) + 1;
    this.seqs.set(userId, next);
    return next;
  }

  current(userId: string): number {
    return this.seqs.get(userId) ?? 0;
  }
}

interface ProjectRecord extends Project {
  userId: string;
  position: string;
  syncSeq: number;
  deleted: boolean;
}

interface TaskRecord extends Task {
  userId: string;
  position: string;
  syncSeq: number;
  deleted: boolean;
}

function toProject({ id, name, color }: ProjectRecord): Project {
  return { id, name, color };
}

function toTask({ userId: _u, position: _p, syncSeq: _s, deleted: _d, ...task }: TaskRecord): Task {
  return task;
}

function byPosition(a: { position: string; id: string }, b: { position: string; id: string }): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : a.id < b.id ? -1 : 1;
}

function bySyncSeq(a: { syncSeq: number }, b: { syncSeq: number }): number {
  return a.syncSeq - b.syncSeq;
}

export class InMemoryProjectStore implements ProjectStore {
  private readonly byId = new Map<string, ProjectRecord>();

  constructor(private readonly counter: InMemorySyncCounter) {}

  private lastPosition(userId: string): string | null {
    let last: string | null = null;
    for (const record of this.byId.values()) {
      if (record.userId === userId && (last === null || record.position > last)) last = record.position;
    }
    return last;
  }

  async listByUser(userId: string): Promise<Project[]> {
    return [...this.byId.values()]
      .filter((record) => record.userId === userId && !record.deleted)
      .sort(byPosition)
      .map(toProject);
  }

  async findById({ userId, id }: { userId: string; id: string }): Promise<Project | null> {
    const record = this.byId.get(id);
    return record && record.userId === userId && !record.deleted ? toProject(record) : null;
  }

  async create({ userId, name, color }: CreateProjectInput): Promise<Project> {
    const record: ProjectRecord = {
      id: newId(),
      userId,
      name,
      color,
      position: orderKeyAfter(this.lastPosition(userId)),
      syncSeq: this.counter.next(userId),
      deleted: false,
    };
    this.byId.set(record.id, record);
    return toProject(record);
  }

  async changesSince({ userId, cursor }: ListChangesInput): Promise<ProjectChange[]> {
    return [...this.byId.values()]
      .filter((record) => record.userId === userId && record.syncSeq > cursor)
      .sort(bySyncSeq)
      .map((record) => ({ ...toProject(record), syncSeq: record.syncSeq, deleted: record.deleted }));
  }
}

export class InMemoryTaskStore implements TaskStore {
  private readonly byId = new Map<string, TaskRecord>();

  constructor(private readonly counter: InMemorySyncCounter) {}

  private lastPosition(userId: string): string | null {
    let last: string | null = null;
    for (const record of this.byId.values()) {
      if (record.userId === userId && (last === null || record.position > last)) last = record.position;
    }
    return last;
  }

  async listRange({ userId, from, to }: ListTasksRangeInput): Promise<Task[]> {
    return [...this.byId.values()]
      .filter((record) => record.userId === userId && !record.deleted && record.date >= from && record.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startAt.localeCompare(b.startAt))
      .map(toTask);
  }

  async findById({ userId, id }: TaskRefInput): Promise<Task | null> {
    const record = this.byId.get(id);
    return record && record.userId === userId && !record.deleted ? toTask(record) : null;
  }

  async listByProject({ userId, projectId }: ListTasksByProjectInput): Promise<Task[]> {
    return [...this.byId.values()]
      .filter((record) => record.userId === userId && !record.deleted && record.projectId === projectId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startAt.localeCompare(b.startAt))
      .map(toTask);
  }

  async countsByProject(userId: string): Promise<ProjectTaskCounts[]> {
    const counts = new Map<string, ProjectTaskCounts>();
    for (const record of this.byId.values()) {
      if (record.userId !== userId || record.deleted || record.projectId === null) continue;
      const entry = counts.get(record.projectId) ?? { projectId: record.projectId, total: 0, done: 0 };
      entry.total += 1;
      if (record.status === 'done') entry.done += 1;
      counts.set(record.projectId, entry);
    }
    return [...counts.values()];
  }

  async create({ userId, title, projectId, date, startAt, durationMin }: CreateTaskInput): Promise<Task> {
    const record: TaskRecord = {
      id: newId(),
      userId,
      projectId,
      title,
      date,
      startAt,
      durationMin,
      status: 'todo',
      version: 1,
      position: orderKeyAfter(this.lastPosition(userId)),
      syncSeq: this.counter.next(userId),
      deleted: false,
    };
    this.byId.set(record.id, record);
    return toTask(record);
  }

  async update({ userId, id, patch }: UpdateTaskInput): Promise<Task | null> {
    const record = this.byId.get(id);
    if (!record || record.userId !== userId || record.deleted) return null;
    Object.assign(record, applyPatch(toTask(record), patch));
    record.syncSeq = this.counter.next(userId);
    return toTask(record);
  }

  async remove({ userId, id }: TaskRefInput): Promise<boolean> {
    const record = this.byId.get(id);
    if (!record || record.userId !== userId || record.deleted) return false;
    record.deleted = true;
    record.version += 1;
    record.syncSeq = this.counter.next(userId);
    return true;
  }

  async changesSince({ userId, cursor }: ListChangesInput): Promise<TaskChange[]> {
    return [...this.byId.values()]
      .filter((record) => record.userId === userId && record.syncSeq > cursor)
      .sort(bySyncSeq)
      .map((record) => ({ ...toTask(record), syncSeq: record.syncSeq, deleted: record.deleted }));
  }

  async syncCursor(userId: string): Promise<number> {
    return this.counter.current(userId);
  }
}
