import type { Collection, DbClient } from '@tanstack/react-db';
import type { CreateProjectRequest, CreateTaskRequest, Project, Task, TaskPatch, TaskStatus } from '@tooday/shared';
import type { TaskTransport } from '@/entities/task/ports';

type TaskCommandDependencies = {
  db: DbClient;
  tasks: Collection<Task, string>;
  projects: Collection<Project, string>;
  transport: TaskTransport;
  signal: AbortSignal;
  invalidateSummaries(): void;
  retain(): Promise<() => void>;
  applyTask(task: Task): Promise<void>;
  removeTask(id: string): Promise<void>;
  applyProject(project: Project): Promise<void>;
};

export function createTaskCommands(deps: TaskCommandDependencies) {
  const { db, tasks, transport, signal } = deps;
  // 같은 업무의 요청 순서가 사용자의 의도 순서와 일치하도록 한다. 다른 업무는 병렬이다.
  const queues = new Map<string, Promise<unknown>>();
  const check = () => {
    if (signal.aborted) throw new DOMException('인증 세션이 종료되었습니다.', 'AbortError');
  };
  function send<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const result = (queues.get(id) ?? Promise.resolve())
      .catch(() => {})
      .then(() => {
        check();
        return operation();
      });
    queues.set(id, result);
    void result
      .finally(() => {
        if (queues.get(id) === result) queues.delete(id);
      })
      .catch(() => {});
    return result;
  }

  async function update(id: string, patch: TaskPatch): Promise<void> {
    const release = await deps.retain();
    try {
      check();
      const transaction = db.createTransaction({
        mutationFn: async () => {
          const { task } = await send(id, () => transport.update({ id, patch }, signal));
          check();
          await deps.applyTask(task);
          deps.invalidateSummaries();
        },
      });
      try {
        transaction.mutate(() => {
          tasks.update(id, (draft) => {
            Object.assign(draft, patch);
          });
        });
      } catch (error) {
        // 스키마 검증 같은 동기 오류도 pending 트랜잭션을 남기지 않는다.
        void transaction.isPersisted.promise.catch(() => {});
        transaction.rollback();
        throw error;
      }
      // 실패 시 DB가 이 트랜잭션의 낙관적 변경만 제거한다. 원본 스냅샷을 복원하지 않는다.
      await transaction.isPersisted.promise;
    } finally {
      release();
    }
  }

  return {
    renameTask: ({ taskId, title }: { taskId: string; title: string }) => update(taskId, { title: title.trim() }),
    setTaskStatus: ({ taskId, status }: { taskId: string; status: TaskStatus }) => update(taskId, { status }),
    moveTaskToProject: ({ taskId, projectId }: { taskId: string; projectId: string | null }) => update(taskId, { projectId }),
    rescheduleTask: ({
      taskId,
      date,
      startAt,
      durationMin,
    }: {
      taskId: string;
      date?: string;
      startAt: string;
      durationMin: number;
    }) => update(taskId, { ...(date === undefined ? {} : { date }), startAt, durationMin }),
    async createTask(input: CreateTaskRequest): Promise<Task> {
      const release = await deps.retain();
      try {
        check();
        const { task } = await transport.create(input, signal);
        check();
        await deps.applyTask(task);
        deps.invalidateSummaries();
        return task;
      } finally {
        release();
      }
    },
    async createProject(input: CreateProjectRequest): Promise<Project> {
      const release = await deps.retain();
      try {
        check();
        const { project } = await transport.createProject(input, signal);
        check();
        await deps.applyProject(project);
        deps.invalidateSummaries();
        return project;
      } finally {
        release();
      }
    },
    async deleteTask({ taskId }: { taskId: string }): Promise<void> {
      const release = await deps.retain();
      try {
        check();
        // 상세 화면에서 성공 전 갑자기 대상이 사라지지 않도록 삭제는 서버 확인 후 반영한다.
        await send(taskId, () => transport.remove(taskId, signal));
        check();
        await deps.removeTask(taskId);
        deps.invalidateSummaries();
      } finally {
        release();
      }
    },
  };
}
