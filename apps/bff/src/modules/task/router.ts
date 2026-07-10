import type { ProjectStore, SyncReadStore, TaskStore } from '@bff/modules/task/ports';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import type { SyncBroker } from '@bff/platform/sync-broker';
import { protectedProcedure, router } from '@bff/trpc/init';
import type { ProjectDetailResponse, ProjectListResponse, SyncChangesResponse, Task, TaskRangeResponse } from '@tooday/shared';
import {
  createProjectRequestSchema,
  createTaskRequestSchema,
  projectDetailRequestSchema,
  syncChangesRequestSchema,
  taskIdRequestSchema,
  taskRangeRequestSchema,
  updateTaskRequestSchema,
} from '@tooday/shared';

export interface TaskRouterDeps {
  tasks: TaskStore;
  projects: ProjectStore;
  syncReads: SyncReadStore;
  sync: SyncBroker;
}

export function createTaskRouter({ tasks, projects, syncReads, sync }: TaskRouterDeps) {
  return router({
    /**
     * 메인(오늘) 화면 주간 창 데이터 + 동기화 커서 베이스라인.
     * 데이터와 커서는 스토어가 단일 스냅샷에서 함께 읽는다 — 라우터에서 낱개
     * 조회를 조합하면 스냅샷이 갈라져 커서가 못 본 변경을 지나칠 수 있다.
     */
    range: protectedProcedure.input(taskRangeRequestSchema).query(async ({ ctx, input }): Promise<TaskRangeResponse> => {
      return syncReads.range({ userId: ctx.userId, ...input });
    }),

    /** 태스크 상세 화면 — 단건 조회 */
    byId: protectedProcedure.input(taskIdRequestSchema).query(async ({ ctx, input }): Promise<{ task: Task }> => {
      const task = await tasks.findById({ userId: ctx.userId, id: input.id });
      if (!task) {
        throw new DomainError(DOMAIN_ERROR_CODES.TASK_NOT_FOUND);
      }
      return { task };
    }),

    create: protectedProcedure.input(createTaskRequestSchema).mutation(async ({ ctx, input }) => {
      if (input.projectId !== null) {
        const project = await projects.findById({ userId: ctx.userId, id: input.projectId });
        if (!project) {
          throw new DomainError(DOMAIN_ERROR_CODES.PROJECT_NOT_FOUND);
        }
      }
      const task = await tasks.create({ userId: ctx.userId, ...input });
      sync.notify(ctx.userId);
      return { task };
    }),

    /**
     * 의도 기반 부분 업데이트 — patch의 필드만 최신 행에 적용한다.
     * 같은 필드의 경합은 나중 의도가 이기고(LWW), 다른 필드끼리는 충돌하지 않는다.
     */
    update: protectedProcedure.input(updateTaskRequestSchema).mutation(async ({ ctx, input }) => {
      if (typeof input.patch.projectId === 'string') {
        const project = await projects.findById({ userId: ctx.userId, id: input.patch.projectId });
        if (!project) {
          throw new DomainError(DOMAIN_ERROR_CODES.PROJECT_NOT_FOUND);
        }
      }
      const task = await tasks.update({ userId: ctx.userId, ...input });
      if (!task) {
        throw new DomainError(DOMAIN_ERROR_CODES.TASK_NOT_FOUND);
      }
      sync.notify(ctx.userId);
      return { task };
    }),

    /** 소프트 삭제 — tombstone이 델타로 다른 기기에 전파된다 */
    delete: protectedProcedure.input(taskIdRequestSchema).mutation(async ({ ctx, input }) => {
      const removed = await tasks.remove({ userId: ctx.userId, id: input.id });
      if (!removed) {
        throw new DomainError(DOMAIN_ERROR_CODES.TASK_NOT_FOUND);
      }
      sync.notify(ctx.userId);
      return { id: input.id };
    }),

    /** 델타 동기화 — 커서 이후의 변경 전부 (tombstone 포함), 단일 스냅샷 (range 주석 참조) */
    changes: protectedProcedure.input(syncChangesRequestSchema).query(async ({ ctx, input }): Promise<SyncChangesResponse> => {
      return syncReads.changes({ userId: ctx.userId, cursor: input.cursor });
    }),

    createProject: protectedProcedure.input(createProjectRequestSchema).mutation(async ({ ctx, input }) => {
      const project = await projects.create({ userId: ctx.userId, ...input });
      sync.notify(ctx.userId);
      return { project };
    }),

    /** 프로젝트 목록 화면 — 프로젝트 라벨에 진행률(완료/전체)을 붙여 내려준다 */
    projects: protectedProcedure.query(async ({ ctx }): Promise<ProjectListResponse> => {
      const [projectList, counts] = await Promise.all([projects.listByUser(ctx.userId), tasks.countsByProject(ctx.userId)]);
      const countById = new Map(counts.map((count) => [count.projectId, count]));
      return {
        projects: projectList.map((project) => {
          const count = countById.get(project.id);
          return { ...project, totalCount: count?.total ?? 0, doneCount: count?.done ?? 0 };
        }),
      };
    }),

    /** 프로젝트 상세(보드) — 프로젝트 라벨과 그 프로젝트의 태스크 전부 */
    project: protectedProcedure
      .input(projectDetailRequestSchema)
      .query(async ({ ctx, input }): Promise<ProjectDetailResponse> => {
        const project = await projects.findById({ userId: ctx.userId, id: input.projectId });
        if (!project) {
          throw new DomainError(DOMAIN_ERROR_CODES.PROJECT_NOT_FOUND);
        }
        const taskList = await tasks.listByProject({ userId: ctx.userId, projectId: input.projectId });
        return { project, tasks: taskList };
      }),
  });
}
