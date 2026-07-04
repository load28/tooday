import type {
  CreateProjectInput,
  CreateTaskInput,
  ListTasksRangeInput,
  ProjectStore,
  SetTaskStatusInput,
  TaskStore,
} from '@bff/modules/task/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { newId } from '@bff/platform/ids';
import { orderKeyAfter } from '@bff/platform/ordering';
import type { Project, Task } from '@tooday/shared';

interface ProjectRecord extends Project {
  userId: string;
  position: string;
}

interface TaskRecord extends Task {
  userId: string;
  position: string;
}

function toProject({ id, name, color }: ProjectRecord): Project {
  return { id, name, color };
}

function toTask({ userId: _userId, position: _position, ...task }: TaskRecord): Task {
  return task;
}

function byPosition(a: { position: string; id: string }, b: { position: string; id: string }): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : a.id < b.id ? -1 : 1;
}

export class InMemoryProjectStore implements ProjectStore {
  private readonly byId = new Map<string, ProjectRecord>();

  private lastPosition(userId: string): string | null {
    let last: string | null = null;
    for (const record of this.byId.values()) {
      if (record.userId === userId && (last === null || record.position > last)) last = record.position;
    }
    return last;
  }

  async listByUser(userId: string): Promise<Project[]> {
    return [...this.byId.values()]
      .filter((record) => record.userId === userId)
      .sort(byPosition)
      .map(toProject);
  }

  async findById({ userId, id }: { userId: string; id: string }): Promise<Project | null> {
    const record = this.byId.get(id);
    return record && record.userId === userId ? toProject(record) : null;
  }

  async create({ userId, name, color }: CreateProjectInput): Promise<Project> {
    const record: ProjectRecord = { id: newId(), userId, name, color, position: orderKeyAfter(this.lastPosition(userId)) };
    this.byId.set(record.id, record);
    return toProject(record);
  }
}

export class InMemoryTaskStore implements TaskStore {
  private readonly byId = new Map<string, TaskRecord>();

  async listRange({ userId, from, to }: ListTasksRangeInput): Promise<Task[]> {
    return [...this.byId.values()]
      .filter((record) => record.userId === userId && record.date >= from && record.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startAt.localeCompare(b.startAt))
      .map(toTask);
  }

  private lastPosition(userId: string): string | null {
    let last: string | null = null;
    for (const record of this.byId.values()) {
      if (record.userId === userId && (last === null || record.position > last)) last = record.position;
    }
    return last;
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
    };
    this.byId.set(record.id, record);
    return toTask(record);
  }

  async setStatus({ userId, id, status, version }: SetTaskStatusInput): Promise<Task | null> {
    const record = this.byId.get(id);
    if (!record || record.userId !== userId) return null;
    if (record.version !== version) {
      throw new DomainError(DOMAIN_ERROR_CODES.TASK_VERSION_CONFLICT);
    }
    record.status = status;
    record.version += 1;
    return toTask(record);
  }
}
