import { type Atom, createStoreContext, useCreateAtom } from '@tanstack/react-store';
import { type PropsWithChildren, useMemo } from 'react';

const { StoreProvider, useStoreContext } = createStoreContext<{ selectedDayOffsetAtom: Atom<number> }>();
export const useTodayDateNavigationStore = useStoreContext;

export function TodayDateNavigationStoreProvider({ children }: PropsWithChildren) {
  const selectedDayOffsetAtom = useCreateAtom(0);
  const value = useMemo(() => ({ selectedDayOffsetAtom }), [selectedDayOffsetAtom]);
  return <StoreProvider value={value}>{children}</StoreProvider>;
}
