import { createContext, type PropsWithChildren, useContext } from 'react';
import type { TaskData } from '@/entities/task/data';

const TaskDataContext = createContext<TaskData | null>(null);

export function TaskDataProvider({ data, children }: PropsWithChildren<{ data: TaskData }>) {
  return <TaskDataContext.Provider value={data}>{children}</TaskDataContext.Provider>;
}

export function useTaskData(): TaskData {
  const data = useContext(TaskDataContext);
  if (!data) throw new Error('TaskDataProvider가 필요합니다.');
  return data;
}
