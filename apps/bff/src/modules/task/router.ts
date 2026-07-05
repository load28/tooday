import type { ProjectStore, TaskStore } from '@bff/modules/task/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import type { SyncHub } from '@bff/platform/sync-hub';
import { protectedProcedure, router } from '@bff/trpc/init';
import type { SyncChangesResponse, TaskRangeResponse } from '@tooday/shared';
import {
  createProjectRequestSchema,
  createTaskRequestSchema,
  syncChangesRequestSchema,
  taskRangeRequestSchema,
  updateTaskRequestSchema,
} from '@tooday/shared';

export interface TaskRouterDeps {
  tasks: TaskStore;
  projects: ProjectStore;
  sync: SyncHub;
}

export function createTaskRouter({ tasks, projects, sync }: TaskRouterDeps) {
  return router({
    /** 메인(오늘) 화면 주간 창 데이터 + 동기화 커서 */
    range: protectedProcedure.input(taskRangeRequestSchema).query(async ({ ctx, input }): Promise<TaskRangeResponse> => {
      const [taskList, projectList, cursor] = await Promise.all([
        tasks.listRange({ userId: ctx.user.id, ...input }),
        projects.listByUser(ctx.user.id),
        tasks.syncCursor(ctx.user.id),
      ]);
      return { tasks: taskList, projects: projectList, cursor };
    }),

    create: protectedProcedure.input(createTaskRequestSchema).mutation(async ({ ctx, input }) => {
      if (input.projectId !== null) {
        const project = await projects.findById({ userId: ctx.user.id, id: input.projectId });
        if (!project) {
          throw new DomainError(DOMAIN_ERROR_CODES.PROJECT_NOT_FOUND);
        }
      }
      const task = await tasks.create({ userId: ctx.user.id, ...input });
      sync.notify(ctx.user.id);
      return { task };
    }),

    /**
     * 의도 기반 부분 업데이트 — patch의 필드만 최신 행에 적용한다.
     * 같은 필드의 경합은 나중 의도가 이기고(LWW), 다른 필드끼리는 충돌하지 않는다.
     */
    update: protectedProcedure.input(updateTaskRequestSchema).mutation(async ({ ctx, input }) => {
      if (typeof input.patch.projectId === 'string') {
        const project = await projects.findById({ userId: ctx.user.id, id: input.patch.projectId });
        if (!project) {
          throw new DomainError(DOMAIN_ERROR_CODES.PROJECT_NOT_FOUND);
        }
      }
      const task = await tasks.update({ userId: ctx.user.id, ...input });
      if (!task) {
        throw new DomainError(DOMAIN_ERROR_CODES.TASK_NOT_FOUND);
      }
      sync.notify(ctx.user.id);
      return { task };
    }),

    /** 델타 동기화 — 커서 이후의 변경 전부 (tombstone 포함) */
    changes: protectedProcedure.input(syncChangesRequestSchema).query(async ({ ctx, input }): Promise<SyncChangesResponse> => {
      const [taskChanges, projectChanges] = await Promise.all([
        tasks.changesSince({ userId: ctx.user.id, cursor: input.cursor }),
        projects.changesSince({ userId: ctx.user.id, cursor: input.cursor }),
      ]);
      const maxSeq = Math.max(input.cursor, ...taskChanges.map((c) => c.syncSeq), ...projectChanges.map((c) => c.syncSeq));
      return { tasks: taskChanges, projects: projectChanges, cursor: maxSeq };
    }),

    createProject: protectedProcedure.input(createProjectRequestSchema).mutation(async ({ ctx, input }) => {
      const project = await projects.create({ userId: ctx.user.id, ...input });
      sync.notify(ctx.user.id);
      return { project };
    }),
  });
}
