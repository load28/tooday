import type { ProjectStore, TaskStore } from '@bff/modules/task/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { protectedProcedure, router } from '@bff/trpc/init';
import type { TaskRangeResponse } from '@tooday/shared';
import {
  createProjectRequestSchema,
  createTaskRequestSchema,
  setTaskStatusRequestSchema,
  taskRangeRequestSchema,
} from '@tooday/shared';

export interface TaskRouterDeps {
  tasks: TaskStore;
  projects: ProjectStore;
}

export function createTaskRouter({ tasks, projects }: TaskRouterDeps) {
  return router({
    /** 메인(오늘) 화면 주간 창 데이터 — 태스크와 프로젝트 라벨을 한 번에 */
    range: protectedProcedure.input(taskRangeRequestSchema).query(async ({ ctx, input }): Promise<TaskRangeResponse> => {
      const [taskList, projectList] = await Promise.all([
        tasks.listRange({ userId: ctx.user.id, ...input }),
        projects.listByUser(ctx.user.id),
      ]);
      return { tasks: taskList, projects: projectList };
    }),

    create: protectedProcedure.input(createTaskRequestSchema).mutation(async ({ ctx, input }) => {
      if (input.projectId !== null) {
        const project = await projects.findById({ userId: ctx.user.id, id: input.projectId });
        if (!project) {
          throw new DomainError(DOMAIN_ERROR_CODES.PROJECT_NOT_FOUND);
        }
      }
      return { task: await tasks.create({ userId: ctx.user.id, ...input }) };
    }),

    setStatus: protectedProcedure.input(setTaskStatusRequestSchema).mutation(async ({ ctx, input }) => {
      const task = await tasks.setStatus({ userId: ctx.user.id, ...input });
      if (!task) {
        throw new DomainError(DOMAIN_ERROR_CODES.TASK_NOT_FOUND);
      }
      return { task };
    }),

    createProject: protectedProcedure.input(createProjectRequestSchema).mutation(async ({ ctx, input }) => ({
      project: await projects.create({ userId: ctx.user.id, ...input }),
    })),
  });
}
