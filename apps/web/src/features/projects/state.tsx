import { type Atom, createStoreContext, useCreateAtom } from '@tanstack/react-store';
import type { TaskStatus } from '@tooday/shared';
import { type PropsWithChildren, useMemo } from 'react';

const { StoreProvider, useStoreContext } = createStoreContext<{ tabAtom: Atom<TaskStatus> }>();
export const useProjectPageState = useStoreContext;

export function ProjectPageStateProvider({ children }: PropsWithChildren) {
  const tabAtom = useCreateAtom<TaskStatus>('todo');
  const value = useMemo(() => ({ tabAtom }), [tabAtom]);
  return <StoreProvider value={value}>{children}</StoreProvider>;
}
