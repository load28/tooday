import { type Atom, createStoreContext, useCreateAtom } from '@tanstack/react-store';
import { type PropsWithChildren, useMemo } from 'react';

type TaskDetailSheet = 'status' | 'project' | 'schedule' | null;
const { StoreProvider, useStoreContext } = createStoreContext<{ openDetailSheetAtom: Atom<TaskDetailSheet> }>();
export const useTaskDetailSheetStore = useStoreContext;

export function TaskDetailSheetStoreProvider({ children }: PropsWithChildren) {
  const openDetailSheetAtom = useCreateAtom<TaskDetailSheet>(null);
  const value = useMemo(() => ({ openDetailSheetAtom }), [openDetailSheetAtom]);
  return <StoreProvider value={value}>{children}</StoreProvider>;
}
