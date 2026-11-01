import { QueryClient } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import type { TaskServerCache } from '@/entities/task/server-cache';
import { type CommandMutation, useCommandMutation } from '@/shared/command-mutation';

type TaskServerQueries = Pick<TaskServerCache, 'taskView' | 'projectView' | 'summaryView' | 'syncError'>;
type TaskCommands = TaskServerCache['commands'];
type TaskActions = { commands: TaskCommands; client: QueryClient };
const QueriesContext = createContext<TaskServerQueries | null>(null);
const ActionsContext = createContext<TaskActions | null>(null);

/** 화면에는 조회와 업무 액션만 공급한다. 캐시 수명 관리는 라우터가 소유한다. */
export function TaskServerCacheProvider({ cache, children }: PropsWithChildren<{ cache: TaskServerCache }>) {
  const queries = useMemo(
    () => ({
      taskView: cache.taskView,
      projectView: cache.projectView,
      summaryView: cache.summaryView,
      syncError: cache.syncError,
    }),
    [cache],
  );
  // 캐시(사용자 세션)마다 mutation 상태를 분리한다.
  const actions = useMemo(() => ({ commands: cache.commands, client: new QueryClient() }), [cache]);
  return (
    <QueriesContext.Provider value={queries}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </QueriesContext.Provider>
  );
}

export function useTaskServerQueries(): TaskServerQueries {
  const queries = useContext(QueriesContext);
  if (!queries) throw new Error('TaskServerCacheProvider가 필요합니다.');
  return queries;
}

/** 이름 있는 DB 명령을 mutation으로 실행한다. 대기·오류는 반환값의 상태로 읽는다. */
export function useTaskAction<K extends keyof TaskCommands>(name: K): CommandMutation<TaskCommands[K]> {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('TaskServerCacheProvider가 필요합니다.');
  return useCommandMutation(actions.commands[name], actions.client);
}

/** 첫 로드 이후 실시간 동기화가 실패해 재시도 중이면 그 오류를 반환한다. 복구되면 null이다. */
export function useTaskSyncError(): unknown {
  return useSelector(useTaskServerQueries().syncError);
}
