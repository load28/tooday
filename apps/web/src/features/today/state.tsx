import { type Atom, createStoreContext, useCreateAtom } from '@tanstack/react-store';
import { type PropsWithChildren, useMemo } from 'react';

const { StoreProvider, useStoreContext } = createStoreContext<{ activeOffsetAtom: Atom<number> }>();
export const useTodayState = useStoreContext;

export function TodayStateProvider({ children }: PropsWithChildren) {
  const activeOffsetAtom = useCreateAtom(0);
  const value = useMemo(() => ({ activeOffsetAtom }), [activeOffsetAtom]);
  return <StoreProvider value={value}>{children}</StoreProvider>;
}
