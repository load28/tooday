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
import type { ApiClient } from '@bff/platform/api-client';
import type { DomainErrorCode } from '@bff/platform/errors';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import type { Project, ProjectChange, Task, TaskChange } from '@tooday/shared';

/** 특정 도메인 코드(소유자 아님/없음)를 null로 접는다 — 포트의 "없으면 null" 계약 구현용. */
async function nullOn<T>(code: DomainErrorCode, run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof DomainError && error.code === code) return null;
    throw error;
  }
}

function userScope(userId: string): string {
  return `/internal/users/${userId}`;
}

export class HttpProjectStore implements ProjectStore {
  constructor(private readonly api: ApiClient) {}

  async listByUser(userId: string): Promise<Project[]> {
    const { projects } = await this.api.request<{ projects: Project[] }>({
      method: 'GET',
      path: `${userScope(userId)}/projects`,
    });
    return projects;
  }

  async findById({ userId, id }: { userId: string; id: string }): Promise<Project | null> {
    return nullOn(DOMAIN_ERROR_CODES.PROJECT_NOT_FOUND, async () => {
      const { project } = await this.api.request<{ project: Project }>({
        method: 'GET',
        path: `${userScope(userId)}/projects/${id}`,
      });
      return project;
    });
  }

  async create({ userId, name, color }: CreateProjectInput): Promise<Project> {
    const { project } = await this.api.request<{ project: Project }>({
      method: 'POST',
      path: `${userScope(userId)}/projects`,
      body: { name, color },
    });
    return project;
  }

  async changesSince({ userId, cursor }: ListChangesInput): Promise<ProjectChange[]> {
    const { changes } = await this.api.request<{ changes: ProjectChange[] }>({
      method: 'GET',
      path: `${userScope(userId)}/project-changes`,
      query: { cursor },
    });
    return changes;
  }
}

export class HttpTaskStore implements TaskStore {
  constructor(private readonly api: ApiClient) {}

  async listRange({ userId, from, to }: ListTasksRangeInput): Promise<Task[]> {
    const { tasks } = await this.api.request<{ tasks: Task[] }>({
      method: 'GET',
      path: `${userScope(userId)}/tasks`,
      query: { from, to },
    });
    return tasks;
  }

  async findById({ userId, id }: TaskRefInput): Promise<Task | null> {
    return nullOn(DOMAIN_ERROR_CODES.TASK_NOT_FOUND, async () => {
      const { task } = await this.api.request<{ task: Task }>({
        method: 'GET',
        path: `${userScope(userId)}/tasks/${id}`,
      });
      return task;
    });
  }

  async listByProject({ userId, projectId }: ListTasksByProjectInput): Promise<Task[]> {
    const { tasks } = await this.api.request<{ tasks: Task[] }>({
      method: 'GET',
      path: `${userScope(userId)}/projects/${projectId}/tasks`,
    });
    return tasks;
  }

  async countsByProject(userId: string): Promise<ProjectTaskCounts[]> {
    const { counts } = await this.api.request<{ counts: ProjectTaskCounts[] }>({
      method: 'GET',
      path: `${userScope(userId)}/task-counts`,
    });
    return counts;
  }

  async create({ userId, ...input }: CreateTaskInput): Promise<Task> {
    const { task } = await this.api.request<{ task: Task }>({
      method: 'POST',
      path: `${userScope(userId)}/tasks`,
      body: input,
    });
    return task;
  }

  async update({ userId, id, patch }: UpdateTaskInput): Promise<Task | null> {
    return nullOn(DOMAIN_ERROR_CODES.TASK_NOT_FOUND, async () => {
      const { task } = await this.api.request<{ task: Task }>({
        method: 'PATCH',
        path: `${userScope(userId)}/tasks/${id}`,
        body: patch,
      });
      return task;
    });
  }

  async remove({ userId, id }: TaskRefInput): Promise<boolean> {
    const removed = await nullOn(DOMAIN_ERROR_CODES.TASK_NOT_FOUND, () =>
      this.api.request<{ ok: boolean }>({ method: 'DELETE', path: `${userScope(userId)}/tasks/${id}` }),
    );
    return removed !== null;
  }

  async changesSince({ userId, cursor }: ListChangesInput): Promise<TaskChange[]> {
    const { changes } = await this.api.request<{ changes: TaskChange[] }>({
      method: 'GET',
      path: `${userScope(userId)}/task-changes`,
      query: { cursor },
    });
    return changes;
  }

  async syncCursor(userId: string): Promise<number> {
    const { cursor } = await this.api.request<{ cursor: number }>({
      method: 'GET',
      path: `${userScope(userId)}/sync-cursor`,
    });
    return cursor;
  }
}
