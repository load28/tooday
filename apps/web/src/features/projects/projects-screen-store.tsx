import { type Atom, createStoreContext, useCreateAtom } from '@tanstack/react-store';
import { type PropsWithChildren, useMemo } from 'react';

type ProjectsScreenStore = {
  createProjectSheetOpenAtom: Atom<boolean>;
};

const { StoreProvider, useStoreContext } = createStoreContext<ProjectsScreenStore>();
export const useProjectsScreenStore = useStoreContext;

export function ProjectsScreenStoreProvider({ children }: PropsWithChildren) {
  const createProjectSheetOpenAtom = useCreateAtom(false);
  const value = useMemo(() => ({ createProjectSheetOpenAtom }), [createProjectSheetOpenAtom]);
  return <StoreProvider value={value}>{children}</StoreProvider>;
}
