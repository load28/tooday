import { type Atom, createStoreContext, useCreateAtom } from '@tanstack/react-store';
import { type PropsWithChildren, useMemo } from 'react';

type ActiveSheet = 'status' | 'project' | 'schedule' | null;
const { StoreProvider, useStoreContext } = createStoreContext<{ activeSheetAtom: Atom<ActiveSheet> }>();
export const useTaskPageState = useStoreContext;

export function TaskPageStateProvider({ children }: PropsWithChildren) {
  const activeSheetAtom = useCreateAtom<ActiveSheet>(null);
  const value = useMemo(() => ({ activeSheetAtom }), [activeSheetAtom]);
  return <StoreProvider value={value}>{children}</StoreProvider>;
}
