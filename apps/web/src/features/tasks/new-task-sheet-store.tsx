import { type Atom, createStoreContext, useCreateAtom } from '@tanstack/react-store';
import { type PropsWithChildren, useMemo } from 'react';

export type NewTaskSheet = 'project' | 'newProject' | 'schedule' | null;

type NewTaskSheetStore = {
  openSheetAtom: Atom<NewTaskSheet>;
};

const { StoreProvider, useStoreContext } = createStoreContext<NewTaskSheetStore>();
export const useNewTaskSheetStore = useStoreContext;

export function NewTaskSheetStoreProvider({ children }: PropsWithChildren) {
  const openSheetAtom = useCreateAtom<NewTaskSheet>(null);
  const value = useMemo(() => ({ openSheetAtom }), [openSheetAtom]);
  return <StoreProvider value={value}>{children}</StoreProvider>;
}
