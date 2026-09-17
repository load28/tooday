import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { collectionOptions, type DbClient, liveQueryCollectionOptions } from '@tanstack/react-db';
import { QueryClient } from '@tanstack/react-query';
import { type ProjectSummary, projectSummarySchema } from '@tooday/shared';
import type { TaskTransport } from '@/entities/task/ports';

/** 서버가 계산한 전체 집계다. 부분 로딩된 tasks를 세어서 대체하지 않는다. */
export function createProjectSummaries(
  db: DbClient,
  userId: string,
  transport: Pick<TaskTransport, 'summaries'>,
  signal: AbortSignal,
  gcTime: number,
  initial?: ProjectSummary[],
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.mount();
  const queryKey = ['project-summaries', userId] as const;
  const rows = db.collection(
    collectionOptions(
      queryCollectionOptions({
        id: `project-summaries:${userId}`,
        queryKey,
        queryClient,
        queryFn: async (context) => {
          const combined = AbortSignal.any([signal, context.signal]);
          const result = await transport.summaries(combined);
          combined.throwIfAborted();
          return result.projects;
        },
        initialData: initial,
        schema: projectSummarySchema,
        getKey: (row) => row.id,
        gcTime,
      }),
    ),
  );
  function view() {
    return db.collection(
      collectionOptions(`project-summary-view:${userId}`, () =>
        liveQueryCollectionOptions({
          id: `project-summary-view:${userId}`,
          query: (q) => q.from({ summary: rows }),
          gcTime,
        }),
      ),
    );
  }
  return {
    view,
    preload: () => view().preload(),
    invalidate() {
      if (signal.aborted) return;
      void queryClient.invalidateQueries({ queryKey }).catch(() => {});
    },
    dehydrate: () => queryClient.getQueryData<ProjectSummary[]>(queryKey),
    clear: () => {
      queryClient.clear();
      queryClient.unmount();
    },
  };
}
