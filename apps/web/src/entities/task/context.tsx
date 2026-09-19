import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import type { TaskServerCache } from '@/entities/task/server-cache';

type TaskServerQueries = Pick<TaskServerCache, 'taskView' | 'projectView' | 'summaryView'>;
type TaskCommands = TaskServerCache['commands'];
const QueriesContext = createContext<TaskServerQueries | null>(null);
const CommandsContext = createContext<TaskCommands | null>(null);

/** 화면에는 조회와 변경 명령만 공급한다. 캐시 수명 관리는 라우터가 소유한다. */
export function TaskServerCacheProvider({ cache, children }: PropsWithChildren<{ cache: TaskServerCache }>) {
  const queries = useMemo(
    () => ({ taskView: cache.taskView, projectView: cache.projectView, summaryView: cache.summaryView }),
    [cache],
  );
  return (
    <QueriesContext.Provider value={queries}>
      <CommandsContext.Provider value={cache.commands}>{children}</CommandsContext.Provider>
    </QueriesContext.Provider>
  );
}

export function useTaskServerQueries(): TaskServerQueries {
  const queries = useContext(QueriesContext);
  if (!queries) throw new Error('TaskServerCacheProvider가 필요합니다.');
  return queries;
}

export function useTaskCommands(): TaskCommands {
  const commands = useContext(CommandsContext);
  if (!commands) throw new Error('TaskServerCacheProvider가 필요합니다.');
  return commands;
}
