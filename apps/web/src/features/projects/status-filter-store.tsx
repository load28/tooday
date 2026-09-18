import { type Atom, createStoreContext, useCreateAtom } from '@tanstack/react-store';
import type { TaskStatus } from '@tooday/shared';
import { type PropsWithChildren, useMemo } from 'react';

const { StoreProvider, useStoreContext } = createStoreContext<{ statusFilterAtom: Atom<TaskStatus> }>();
export const useProjectStatusFilterStore = useStoreContext;

export function ProjectStatusFilterStoreProvider({ children }: PropsWithChildren) {
  const statusFilterAtom = useCreateAtom<TaskStatus>('todo');
  const value = useMemo(() => ({ statusFilterAtom }), [statusFilterAtom]);
  return <StoreProvider value={value}>{children}</StoreProvider>;
}
